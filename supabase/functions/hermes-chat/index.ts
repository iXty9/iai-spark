import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1),
  stream: z.boolean().optional().default(false),
});

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
    const { messages, stream } = parsed.data;

    const hermesBase = Deno.env.get("HERMES_API_BASE_URL");
    const hermesKey = Deno.env.get("HERMES_API_SERVER_KEY");
    const hermesModel = Deno.env.get("HERMES_MODEL") || "sandbox-hermes";
    if (!hermesBase || !hermesKey) {
      return jsonResponse({ code: "misconfigured", error: "Hermes not configured" }, 500);
    }

    const upstreamUrl = `${hermesBase.replace(/\/$/, "")}/chat/completions`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hermesKey}`,
        "Content-Type": "application/json",
        "X-Hermes-Session-Key": `client:iai-spark:user:${user.id}`,
      },
      body: JSON.stringify({
        model: hermesModel,
        messages,
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

    return jsonResponse({ content, raw: data }, 200);
  } catch (err: any) {
    console.error("hermes-chat unexpected error:", err?.message || err);
    return jsonResponse({ code: "internal_error", error: "Unexpected error" }, 500);
  }
});
