// Pure rules for Hermes conversation continuity. No network, no DB.
// Contract: Hermes 0.23.1 (CT117) — see .lovable/plan/hermes-conversation-continuity.md

export type TurnStatus = "pending" | "completed" | "failed" | "uncertain";

export interface ConversationRow {
  user_id: string;
  generation: number;
  conversation_token: string;
  hermes_session_id: string;
}

export interface TurnRow {
  status: TurnStatus;
  reply: string | null;
  error_code: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

export function newSessionId(): string {
  return `iai-${crypto.randomUUID()}`;
}

export function sessionKeyFor(userId: string): string {
  return `client:iai-spark:user:${userId}`;
}

/** Server-derived, namespaced; stable per logical turn, distinct across turns/generations. */
export async function idempotencyKeyFor(userId: string, generation: number, clientMessageId: string): Promise<string> {
  const data = new TextEncoder().encode(`iai-spark|${userId}|${generation}|${clientMessageId.toLowerCase()}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return "iai-" + Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Flag lookup: any failure is an error, never a silent mode choice. */
export function parseFlag(row: { value?: unknown } | null, error: unknown): { ok: true; enabled: boolean } | { ok: false } {
  if (error) return { ok: false };
  if (!row) return { ok: true, enabled: false };
  const v = String(row.value ?? "").trim().toLowerCase();
  if (v === "true") return { ok: true, enabled: true };
  if (v === "false" || v === "") return { ok: true, enabled: false };
  return { ok: false };
}

export function generationMatches(row: ConversationRow, token: unknown): boolean {
  return typeof token === "string" && token === row.conversation_token;
}

export type TurnDecision = "dispatch" | "replay" | "in_progress" | "uncertain" | "failed";
/** Existing turn for (user, generation, message id) decides what a (re)send does. Never re-dispatches. */
export function decideTurn(existing: TurnRow | null): TurnDecision {
  if (!existing) return "dispatch";
  switch (existing.status) {
    case "completed": return "replay";
    case "pending": return "in_progress";
    case "uncertain": return "uncertain";
    default: return "failed";
  }
}

export function buildUpstream(p: {
  model: string; sessionId: string; userId: string; actor: string; actorHeader: string;
  actorSystemContent: string; userContent: string; idempotencyKey: string; apiKey: string;
}): { headers: Record<string, string>; body: string } {
  return {
    headers: {
      "Authorization": `Bearer ${p.apiKey}`,
      "Content-Type": "application/json",
      "X-Hermes-Session-Id": p.sessionId,
      "X-Hermes-Session-Key": sessionKeyFor(p.userId),
      "Idempotency-Key": p.idempotencyKey,
      [p.actorHeader]: p.actor,
    },
    body: JSON.stringify({
      model: p.model,
      // System message = per-turn ephemeral prompt in Hermes; history comes from the session.
      messages: [
        { role: "system", content: p.actorSystemContent },
        { role: "user", content: p.userContent },
      ],
      stream: false,
    }),
  };
}

export type Outcome =
  | { kind: "ok"; content: string }
  | { kind: "error"; code: string; turnStatus: "failed" | "uncertain"; message: string };

export const USER_MESSAGES: Record<string, string> = {
  session_unavailable: "This conversation is no longer available — start a new chat.",
  hermes_busy: "Hermes is busy, try again in a moment.",
  hermes_queued: "Received, still working. Please don't resend.",
  hermes_uncertain: "Hermes may have received this message. Wait a moment before resending.",
  hermes_bad_request: "Hermes couldn't accept that message.",
  hermes_conflict: "Hermes refused this message as a conflicting retry.",
  session_mismatch: "Hermes answered on a different conversation. Start a new chat.",
  stale_generation: "This chat was reset in another window. Please send your message again.",
  turn_in_progress: "That message is still being worked on.",
  turn_failed: "That message failed earlier. Send it again as a new message.",
  config_error: "Hermes settings couldn't be read. Try again shortly.",
};

const err = (code: string, turnStatus: "failed" | "uncertain"): Outcome =>
  ({ kind: "error", code, turnStatus, message: USER_MESSAGES[code] ?? "Hermes error." });

/** Map a Hermes response to an outcome. `transportError` = timeout/network (may have executed). */
export function classifyHermes(r: {
  status?: number; bodyText?: string; sentSessionId: string; returnedSessionId?: string | null; transportError?: boolean;
}): Outcome {
  if (r.transportError || r.status === undefined) return err("hermes_uncertain", "uncertain");
  let body: any = null;
  try { body = r.bodyText ? JSON.parse(r.bodyText) : null; } catch { body = null; }
  const code = body?.error?.code ?? body?.code ?? null;
  const s = r.status;
  if (s >= 200 && s < 300) {
    if (r.returnedSessionId && r.returnedSessionId !== r.sentSessionId) return err("session_mismatch", "uncertain");
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return err("hermes_uncertain", "uncertain");
    return { kind: "ok", content };
  }
  if (s === 400) return err("hermes_bad_request", "failed");
  if (s === 409 && code === "not_found") return err("session_unavailable", "failed");
  if (s === 409) return err("hermes_conflict", "failed");
  if (s === 429) return err("hermes_busy", "failed");
  if (s === 503 && code === "admission_queued") return err("hermes_queued", "uncertain");
  return err("hermes_uncertain", "uncertain");
}
