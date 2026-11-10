// Hermes continuity bridge with injected dependencies (testable with fakes).
import {
  buildUpstream, classifyHermes, ConversationRow, decideTurn, generationMatches,
  idempotencyKeyFor, isUuid, newSessionId, TurnRow, USER_MESSAGES,
} from "./hermes-session-core.ts";

export interface HermesStore {
  getOrCreateConversation(userId: string, newSessionId: string): Promise<ConversationRow>;
  getConversation(userId: string): Promise<ConversationRow | null>;
  /** Atomic: only if token matches. Returns new row or null when stale. */
  resetConversation(userId: string, token: string, newToken: string, newSessionId: string): Promise<ConversationRow | null>;
  getTurn(userId: string, generation: number, msgId: string): Promise<TurnRow | null>;
  /** Returns false if the turn already exists. */
  insertPendingTurn(userId: string, generation: number, msgId: string): Promise<boolean>;
  finishTurn(userId: string, generation: number, msgId: string, status: "completed" | "failed" | "uncertain", reply: string | null, errorCode: string | null): Promise<void>;
}

export interface BridgeDeps {
  store: HermesStore;
  fetch: typeof fetch;
  hermesBase: string; apiKey: string; model: string;
  actorHeader: string;
  mintActor: () => Promise<string>;
  timeoutMs?: number;
}

export type BridgeResult = { status: number; body: Record<string, unknown> };

const fail = (status: number, code: string, extra: Record<string, unknown> = {}): BridgeResult =>
  ({ status, body: { code, error: USER_MESSAGES[code] ?? code, continuity: true, ...extra } });

const state = (row: ConversationRow) => ({ conversation_token: row.conversation_token, generation: row.generation });

export async function handleState(deps: BridgeDeps, userId: string): Promise<BridgeResult> {
  const row = await deps.store.getOrCreateConversation(userId, newSessionId());
  return { status: 200, body: { enabled: true, ...state(row) } };
}

export async function handleReset(deps: BridgeDeps, userId: string, token: unknown): Promise<BridgeResult> {
  const current = await deps.store.getOrCreateConversation(userId, newSessionId());
  if (!generationMatches(current, token)) return fail(409, "stale_generation", state(current));
  const next = await deps.store.resetConversation(userId, current.conversation_token, crypto.randomUUID(), newSessionId());
  if (!next) {
    const latest = await deps.store.getConversation(userId);
    return fail(409, "stale_generation", latest ? state(latest) : {});
  }
  return { status: 200, body: { enabled: true, reset: true, ...state(next) } };
}

export async function handleSend(
  deps: BridgeDeps, userId: string, input: { token: unknown; clientMessageId: unknown; content: string },
): Promise<BridgeResult> {
  if (!isUuid(input.clientMessageId)) return fail(400, "invalid_body", { error: "client_message_id must be a UUID" });
  const msgId = input.clientMessageId.toLowerCase();
  const row = await deps.store.getOrCreateConversation(userId, newSessionId());
  if (!generationMatches(row, input.token)) return fail(409, "stale_generation", state(row));

  const existing = await deps.store.getTurn(userId, row.generation, msgId);
  const decision = decideTurn(existing);
  if (decision === "replay") return { status: 200, body: { content: existing!.reply ?? "", replayed: true, continuity: true, ...state(row) } };
  if (decision === "in_progress") return fail(409, "turn_in_progress", state(row));
  if (decision === "uncertain") return fail(409, "hermes_uncertain", state(row));
  if (decision === "failed") return fail(409, "turn_failed", state(row));

  if (!(await deps.store.insertPendingTurn(userId, row.generation, msgId))) return fail(409, "turn_in_progress", state(row));

  const actor = await deps.mintActor();
  const up = buildUpstream({
    model: deps.model, sessionId: row.hermes_session_id, userId, actor, actorHeader: deps.actorHeader,
    actorSystemContent: `IXTY_ACTOR:${actor}\nPass this exact value as \`actor\` on every CMS v2 tool call. It identifies the signed-in user and expires in 10 minutes.`,
    userContent: input.content,
    idempotencyKey: await idempotencyKeyFor(userId, row.generation, msgId),
    apiKey: deps.apiKey,
  });

  let outcome;
  try {
    const res = await deps.fetch(`${deps.hermesBase.replace(/\/$/, "")}/chat/completions`, {
      method: "POST", headers: up.headers, body: up.body,
      signal: AbortSignal.timeout(deps.timeoutMs ?? 110_000),
    });
    const bodyText = await res.text();
    outcome = classifyHermes({ status: res.status, bodyText, sentSessionId: row.hermes_session_id, returnedSessionId: res.headers.get("x-hermes-session-id") });
  } catch {
    outcome = classifyHermes({ transportError: true, sentSessionId: row.hermes_session_id });
  }

  // Fence: a reset that happened during the call wins; the stale reply is not stored or shown.
  const after = await deps.store.getConversation(userId);
  if (!after || after.generation !== row.generation) {
    await deps.store.finishTurn(userId, row.generation, msgId, "failed", null, "stale_generation");
    return fail(409, "stale_generation", after ? state(after) : {});
  }

  if (outcome.kind === "ok") {
    await deps.store.finishTurn(userId, row.generation, msgId, "completed", outcome.content, null);
    return { status: 200, body: { content: outcome.content, continuity: true, ...state(row) } };
  }
  await deps.store.finishTurn(userId, row.generation, msgId, outcome.turnStatus, null, outcome.code);
  return fail(outcome.code === "hermes_busy" ? 429 : 502, outcome.code, state(row));
}
