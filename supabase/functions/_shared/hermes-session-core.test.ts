import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildUpstream, classifyHermes, decideTurn, idempotencyKeyFor, parseFlag, ConversationRow, TurnRow } from "./hermes-session-core.ts";
import { BridgeDeps, handleReset, handleSend, handleState, HermesStore } from "./hermes-bridge.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const M1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const M2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

Deno.test("upstream: stable session id, session key, idempotency key, system + user only", () => {
  const u = buildUpstream({ model: "m", sessionId: "iai-x", userId: U1, actor: "A", actorHeader: "x-ixty-actor", actorSystemContent: "IXTY_ACTOR:A", userContent: "hi", idempotencyKey: "k", apiKey: "s" });
  assertEquals(u.headers["X-Hermes-Session-Id"], "iai-x");
  assertEquals(u.headers["X-Hermes-Session-Key"], `client:iai-spark:user:${U1}`);
  assertEquals(u.headers["Idempotency-Key"], "k");
  const b = JSON.parse(u.body);
  assertEquals(b.messages.map((m: any) => m.role), ["system", "user"]);
  assertEquals(b.stream, false);
});

Deno.test("classify: response classes", () => {
  const ok = JSON.stringify({ choices: [{ message: { content: "hey" } }] });
  assertEquals(classifyHermes({ status: 200, bodyText: ok, sentSessionId: "a", returnedSessionId: "a" }), { kind: "ok", content: "hey" });
  assertEquals((classifyHermes({ status: 200, bodyText: ok, sentSessionId: "a", returnedSessionId: "b" }) as any).code, "session_mismatch");
  assertEquals((classifyHermes({ status: 200, bodyText: "{}", sentSessionId: "a" }) as any).turnStatus, "uncertain");
  assertEquals((classifyHermes({ status: 409, bodyText: JSON.stringify({ error: { code: "not_found" } }), sentSessionId: "a" }) as any).code, "session_unavailable");
  assertEquals((classifyHermes({ status: 409, bodyText: JSON.stringify({ error: { code: "admission_conflict" } }), sentSessionId: "a" }) as any).code, "hermes_conflict");
  assertEquals((classifyHermes({ status: 429, sentSessionId: "a" }) as any).turnStatus, "failed");
  const q = classifyHermes({ status: 503, bodyText: JSON.stringify({ error: { code: "admission_queued" } }), sentSessionId: "a" }) as any;
  assertEquals([q.code, q.turnStatus], ["hermes_queued", "uncertain"]);
  assertEquals((classifyHermes({ transportError: true, sentSessionId: "a" }) as any).turnStatus, "uncertain");
  assertEquals((classifyHermes({ status: 400, sentSessionId: "a" }) as any).turnStatus, "failed");
});

Deno.test("idempotency key: stable per turn, differs across turn/generation/user", async () => {
  const k = await idempotencyKeyFor(U1, 1, M1);
  assertEquals(k, await idempotencyKeyFor(U1, 1, M1.toUpperCase()));
  assertNotEquals(k, await idempotencyKeyFor(U1, 1, M2));
  assertNotEquals(k, await idempotencyKeyFor(U1, 2, M1));
  assertNotEquals(k, await idempotencyKeyFor(U2, 1, M1));
});

Deno.test("flag: off by default, lookup failure or junk is an error", () => {
  assertEquals(parseFlag(null, null), { ok: true, enabled: false });
  assertEquals(parseFlag({ value: "true" }, null), { ok: true, enabled: true });
  assertEquals(parseFlag({ value: "false" }, null), { ok: true, enabled: false });
  assertEquals(parseFlag(null, new Error("x")), { ok: false });
  assertEquals(parseFlag({ value: "yes" }, null), { ok: false });
});

Deno.test("turn decisions never re-dispatch", () => {
  const t = (status: any): TurnRow => ({ status, reply: null, error_code: null });
  assertEquals(decideTurn(null), "dispatch");
  assertEquals(decideTurn(t("completed")), "replay");
  assertEquals(decideTurn(t("pending")), "in_progress");
  assertEquals(decideTurn(t("uncertain")), "uncertain");
  assertEquals(decideTurn(t("failed")), "failed");
});

// ---- bridge tests with fake store + fake Hermes ----
function fakeStore() {
  const convs = new Map<string, ConversationRow>();
  const turns = new Map<string, TurnRow>();
  const key = (u: string, g: number, m: string) => `${u}|${g}|${m}`;
  const store: HermesStore & { convs: typeof convs; turns: typeof turns; failReset?: boolean } = {
    convs, turns,
    async getOrCreateConversation(u, sid) {
      if (!convs.has(u)) convs.set(u, { user_id: u, generation: 1, conversation_token: crypto.randomUUID(), hermes_session_id: sid });
      return { ...convs.get(u)! };
    },
    async getConversation(u) { const r = convs.get(u); return r ? { ...r } : null; },
    async resetConversation(u, tok, nt, sid) {
      if ((store as any).failReset) throw new Error("db down");
      const r = convs.get(u); if (!r || r.conversation_token !== tok) return null;
      const n = { user_id: u, generation: r.generation + 1, conversation_token: nt, hermes_session_id: sid };
      convs.set(u, n); return { ...n };
    },
    async getTurn(u, g, m) { return turns.get(key(u, g, m)) ?? null; },
    async insertPendingTurn(u, g, m) { if (turns.has(key(u, g, m))) return false; turns.set(key(u, g, m), { status: "pending", reply: null, error_code: null }); return true; },
    async finishTurn(u, g, tok, m, status, reply, error_code) {
      await (store as any).beforeFinish?.();
      const c = convs.get(u);
      if (!c || c.generation !== g || c.conversation_token !== tok) { turns.set(key(u, g, m), { status: "failed", reply: null, error_code: "stale_generation" }); return false; }
      turns.set(key(u, g, m), { status, reply, error_code }); return true;
    },
  };
  return store;
}

function deps(store: HermesStore, onCall?: (h: Record<string, string>) => void | Promise<void>, respond?: () => Response): BridgeDeps & { calls: Record<string, string>[] } {
  const calls: Record<string, string>[] = [];
  return {
    calls, store, hermesBase: "https://h/v1", apiKey: "k", model: "m", actorHeader: "x-ixty-actor",
    mintActor: async () => `actor-${calls.length}`,
    fetch: (async (_u: string, init: RequestInit) => {
      const h = init.headers as Record<string, string>;
      calls.push(h);
      await onCall?.(h);
      return respond ? respond() : new Response(JSON.stringify({ choices: [{ message: { content: "reply" } }] }), { status: 200, headers: { "X-Hermes-Session-Id": h["X-Hermes-Session-Id"] } });
    }) as typeof fetch,
  };
}

Deno.test("bridge: concurrent first use shares one session id; turns reuse it", async () => {
  const s = fakeStore(); const d = deps(s);
  const [a, b] = await Promise.all([handleState(d, U1), handleState(d, U1)]);
  assertEquals(a.body.conversation_token, b.body.conversation_token);
  await handleSend(d, U1, { token: a.body.conversation_token, clientMessageId: M1, content: "1" });
  await handleSend(d, U1, { token: a.body.conversation_token, clientMessageId: M2, content: "2" });
  assertEquals(d.calls.length, 2);
  assertEquals(d.calls[0]["X-Hermes-Session-Id"], d.calls[1]["X-Hermes-Session-Id"]);
  assert(d.calls[0]["X-Hermes-Session-Id"].startsWith("iai-"));
});

Deno.test("bridge: same-message retry replays stored reply without calling Hermes", async () => {
  const s = fakeStore(); const d = deps(s);
  const st = await handleState(d, U1);
  const r1 = await handleSend(d, U1, { token: st.body.conversation_token, clientMessageId: M1, content: "x" });
  const r2 = await handleSend(d, U1, { token: st.body.conversation_token, clientMessageId: M1, content: "x" });
  assertEquals(r1.body.content, "reply"); assertEquals(r2.body.content, "reply"); assertEquals(r2.body.replayed, true);
  assertEquals(d.calls.length, 1);
});

Deno.test("bridge: pending or uncertain retry is not resent", async () => {
  const s = fakeStore();
  const d = deps(s, undefined, () => { throw new Error("timeout"); });
  const st = await handleState(d, U1);
  const r1 = await handleSend(d, U1, { token: st.body.conversation_token, clientMessageId: M1, content: "x" });
  assertEquals(r1.body.code, "hermes_uncertain");
  const r2 = await handleSend(d, U1, { token: st.body.conversation_token, clientMessageId: M1, content: "x" });
  assertEquals(r2.body.code, "hermes_uncertain");
  assertEquals(d.calls.length, 1);
  await s.insertPendingTurn(U1, 1, M2);
  const r3 = await handleSend(d, U1, { token: st.body.conversation_token, clientMessageId: M2, content: "y" });
  assertEquals(r3.body.code, "turn_in_progress"); assertEquals(d.calls.length, 1);
});

Deno.test("bridge: reset during in-flight send refuses and does not store the stale reply", async () => {
  const s = fakeStore();
  let token = "";
  const d = deps(s, async () => { await handleReset(deps(s), U1, token); });
  token = (await handleState(d, U1)).body.conversation_token as string;
  const r = await handleSend(d, U1, { token, clientMessageId: M1, content: "x" });
  assertEquals(r.status, 409); assertEquals(r.body.code, "stale_generation");
  assertEquals((await s.getTurn(U1, 1, M1))?.reply, null);
  assertEquals(s.convs.get(U1)!.generation, 2);
});

Deno.test("bridge: reset gives a new session id; stale token refused; failed reset leaves row", async () => {
  const s = fakeStore(); const d = deps(s);
  const st = await handleState(d, U1);
  const before = s.convs.get(U1)!;
  const r = await handleReset(d, U1, st.body.conversation_token);
  assertEquals(r.status, 200);
  assertNotEquals(s.convs.get(U1)!.hermes_session_id, before.hermes_session_id);
  assertEquals((await handleReset(d, U1, st.body.conversation_token)).body.code, "stale_generation");
  assertEquals((await handleSend(d, U1, { token: st.body.conversation_token, clientMessageId: M1, content: "x" })).body.code, "stale_generation");
  const snapshot = { ...s.convs.get(U1)! };
  (s as any).failReset = true;
  let threw = false;
  try { await handleReset(d, U1, snapshot.conversation_token); } catch { threw = true; }
  assert(threw); assertEquals(s.convs.get(U1), snapshot);
});

Deno.test("bridge: another user's token is refused; users get separate sessions", async () => {
  const s = fakeStore(); const d = deps(s);
  const a = await handleState(d, U1); await handleState(d, U2);
  const r = await handleSend(d, U2, { token: a.body.conversation_token, clientMessageId: M1, content: "x" });
  assertEquals(r.body.code, "stale_generation"); assertEquals(d.calls.length, 0);
  assertNotEquals(s.convs.get(U1)!.hermes_session_id, s.convs.get(U2)!.hermes_session_id);
});

Deno.test("bridge: Hermes error envelope and non-UUID message id", async () => {
  const s = fakeStore();
  const d = deps(s, undefined, () => new Response(JSON.stringify({ error: { code: "not_found" } }), { status: 409 }));
  const st = await handleState(d, U1);
  const r = await handleSend(d, U1, { token: st.body.conversation_token, clientMessageId: M1, content: "x" });
  assertEquals(r.body.code, "session_unavailable"); assertEquals((await s.getTurn(U1, 1, M1))?.status, "failed");
  assertEquals((await handleSend(d, U1, { token: st.body.conversation_token, clientMessageId: "msg_1", content: "x" })).status, 400);
});

Deno.test("bridge: reset after the reply arrives but before saving -> not stored, stale_generation", async () => {
  const s = fakeStore(); const d = deps(s);
  const token = (await handleState(d, U1)).body.conversation_token as string;
  (s as any).beforeFinish = async () => { (s as any).beforeFinish = null; await handleReset(deps(s), U1, token); };
  const r = await handleSend(d, U1, { token, clientMessageId: M1, content: "x" });
  assertEquals(r.status, 409); assertEquals(r.body.code, "stale_generation");
  const t = await s.getTurn(U1, 1, M1);
  assertEquals([t?.status, t?.reply], ["failed", null]);
  assertEquals(r.body.generation, 2);
});
