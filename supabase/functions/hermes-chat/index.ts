import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { ACTOR_HEADER, signActor, secretUsable } from "../_shared/ixty-actor.ts";
import { parseFlag } from "../_shared/hermes-session-core.ts";
import { handleReset, handleSend, handleState, HermesStore } from "../_shared/hermes-bridge.ts";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const BodySchema = z.object({
  action: z.enum(["send", "reset", "state"]).optional().default("send"),
  messages: z.array(MessageSchema).optional().default([]),
  stream: z.boolean().optional().default(false),
  conversation_token: z.string().uuid().optional(),
  client_message_id: z.string().max(64).optional(),
});

function makeStore(db: any): HermesStore {
  const one = async (q: any) => { const { data, error } = await q; if (error) throw new Error(error.message); return data; };
  return {
    async getOrCreateConversation(userId, sid) {
      await one(db.from("hermes_conversations").upsert({ user_id: userId, hermes_session_id: sid }, { onConflict: "user_id", ignoreDuplicates: true }));
      return await one(db.from("hermes_conversations").select("user_id, generation, conversation_token, hermes_session_id").eq("user_id", userId).single());
    },
    async getConversation(userId) {
      return await one(db.from("hermes_conversations").select("user_id, generation, conversation_token, hermes_session_id").eq("user_id", userId).maybeSingle());
    },
    async resetConversation(userId, token, newToken, sid) {
      const cur = await one(db.from("hermes_conversations").select("generation").eq("user_id", userId).eq("conversation_token", token).maybeSingle());
      if (!cur) return null;
      return await one(db.from("hermes_conversations")
        .update({ generation: cur.generation + 1, conversation_token: newToken, hermes_session_id: sid })
        .eq("user_id", userId).eq("conversation_token", token)
        .select("user_id, generation, conversation_token, hermes_session_id").maybeSingle());
    },
    async getTurn(userId, generation, msgId) {
      return await one(db.from("hermes_turns").select("status, reply, error_code").eq("user_id", userId).eq("generation", generation).eq("client_message_id", msgId).maybeSingle());
    },
    async insertPendingTurn(userId, generation, msgId) {
      const { error } = await db.from("hermes_turns").insert({ user_id: userId, generation, client_message_id: msgId, status: "pending" });
      if (!error) return true;
      if (error.code === "23505") return false;
      throw new Error(error.message);
    },
    async finishTurn(userId, generation, token, msgId, status, reply, errorCode) {
      return !!(await one(db.rpc("hermes_finish_turn", {
        p_user: userId, p_generation: generation, p_token: token, p_msg: msgId,
        p_status: status, p_reply: reply, p_error: errorCode,
      })));
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ code: "unauthorized", error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller JWT
    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authedClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ code: "unauthorized", error: "Invalid token" }, 401);
    }

    // Service-role client for defense-in-depth checks
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) preferred_backend must be 'hermes'
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("preferred_backend")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("hermes-chat profile lookup error:", profileError.message);
      return jsonResponse({ code: "internal_error", error: "Profile lookup failed" }, 500);
    }
    if (profile?.preferred_backend !== "hermes") {
      return jsonResponse({ code: "hermes_not_selected", error: "Hermes backend not selected" }, 409);
    }

    // 2) allowlist must have enabled=true
    const { data: allow, error: allowError } = await adminClient
      .from("hermes_allowed_users")
      .select("enabled")
      .eq("user_id", user.id)
      .maybeSingle();
    if (allowError) {
      console.error("hermes-chat allowlist lookup error:", allowError.message);
      return jsonResponse({ code: "internal_error", error: "Allowlist lookup failed" }, 500);
    }
    if (!allow?.enabled) {
      return jsonResponse({ code: "hermes_not_allowed", error: "User not allowed for Hermes" }, 403);
    }

    // Validate body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ code: "invalid_body", error: "Invalid JSON" }, 400);
    }
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        { code: "invalid_body", error: parsed.error.flatten() },
        400,
      );
    }
    const { messages, stream, action } = parsed.data;

    const hermesBase = Deno.env.get("HERMES_API_BASE_URL");
    const hermesKey = Deno.env.get("HERMES_API_SERVER_KEY");
    const hermesModel = Deno.env.get("HERMES_MODEL") || "sandbox-hermes";
    if (!hermesBase || !hermesKey) {
      return jsonResponse({ code: "misconfigured", error: "Hermes not configured" }, 500);
    }

    // Signed "who is asking" note for CMS v2 tools (same as chat-relay).
    // Identity comes only from this server-minted note, never from the browser.
    const signingSecret = Deno.env.get("IXTY_ACTOR_SIGNING_SECRET");
    if (!secretUsable(signingSecret)) {
      return jsonResponse({ code: "misconfigured", error: "Actor signing not configured" }, 500);
    }
    const { data: ghlRows } = await adminClient
      .from("ghl_installations")
      .select("id, location_id")
      .eq("user_id", user.id).eq("connection_status", "connected")
      .order("updated_at", { ascending: false }).limit(1);
    const ghl = ghlRows?.[0]?.location_id ? ghlRows[0] : null;
    const actor = await signActor({ sub: user.id, inst: ghl?.id ?? null, loc: ghl?.location_id ?? null }, signingSecret);
    const actorMessage = {
      role: "system" as const,
      content: `IXTY_ACTOR:${actor}\nPass this exact value as \`actor\` on every CMS v2 tool call. It identifies the signed-in user and expires in 10 minutes.`,
    };

    // Continuity switch: a failed lookup is an error, never a silent mode choice.
    const { data: flagRow, error: flagError } = await adminClient
      .from("app_settings").select("value").eq("key", "hermes_session_continuity_enabled").maybeSingle();
    const flag = parseFlag(flagRow, flagError);
    if (!flag.ok) {
      return jsonResponse({ code: "config_error", error: "Hermes settings couldn't be read. Try again shortly.", continuity: true }, 503);
    }

    if (flag.enabled) {
      const deps = {
        store: makeStore(adminClient), fetch, hermesBase, apiKey: hermesKey, model: hermesModel,
        actorHeader: ACTOR_HEADER,
        mintActor: () => signActor({ sub: user.id, inst: ghl?.id ?? null, loc: ghl?.location_id ?? null }, signingSecret),
      };
      let result;
      if (action === "state") result = await handleState(deps, user.id);
      else if (action === "reset") result = await handleReset(deps, user.id, parsed.data.conversation_token);
      else {
        const last = [...messages].reverse().find((m) => m.role === "user");
        if (!last) return jsonResponse({ code: "invalid_body", error: "A user message is required" }, 400);
        result = await handleSend(deps, user.id, {
          token: parsed.data.conversation_token, clientMessageId: parsed.data.client_message_id, content: last.content,
        });
      }
      if (result.status >= 400) console.warn("hermes-chat continuity", action, result.status, result.body.code);
      return jsonResponse(result.body, result.status);
    }

    // Switch off: today's stateless behaviour (emergency containment).
    if (action !== "send") return jsonResponse({ enabled: false }, 200);
    if (messages.length === 0) return jsonResponse({ code: "invalid_body", error: "messages required" }, 400);
    const { data: boundRow } = await adminClient.from("hermes_conversations").select("user_id").eq("user_id", user.id).maybeSingle();
    const continuityNotice = !!boundRow;

    const upstreamUrl = `${hermesBase.replace(/\/$/, "")}/chat/completions`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hermesKey}`,
        "Content-Type": "application/json",
        "X-Hermes-Session-Key": `client:iai-spark:user:${user.id}`,
        [ACTOR_HEADER]: actor,
      },
      body: JSON.stringify({
        model: hermesModel,
        messages: [actorMessage, ...messages],
        stream,
      }),
    });

    // SSE passthrough
    if (
      stream &&
      upstreamRes.body &&
      upstreamRes.headers.get("content-type")?.includes("text/event-stream")
    ) {
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const text = await upstreamRes.text();
    if (!upstreamRes.ok) {
      console.error("hermes-chat upstream error", upstreamRes.status, text.slice(0, 500));
      return jsonResponse(
        { code: "upstream_error", error: `Hermes returned ${upstreamRes.status}` },
        502,
      );
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return jsonResponse({ code: "upstream_error", error: "Invalid upstream response" }, 502);
    }

    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      "";

    return jsonResponse({ content, raw: data, continuity_notice: continuityNotice }, 200);
  } catch (err: any) {
    console.error("hermes-chat unexpected error:", err?.message || err);
    return jsonResponse({ code: "internal_error", error: "Unexpected error" }, 500);
  }
});
