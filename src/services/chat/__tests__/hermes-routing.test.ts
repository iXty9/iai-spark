import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
const webhook = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } } }));
vi.mock('@/services/webhook', () => ({ sendWebhookMessage: (...a: any[]) => webhook(...a) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/utils/logging', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@/utils/debug-events', () => ({ emitDebugEvent: vi.fn() }));
vi.mock('@/utils/debug/webhook-debug', () => ({ parseWebhookResponse: (r: any) => String(r?.text ?? 'WEBHOOK') }));
vi.mock('@/services/chat/utils/response-processing', () => ({ processResponseMetadata: vi.fn(), createErrorResponse: vi.fn() }));
vi.mock('@/services/chat/utils/streaming', () => ({ handleStreamingResponse: async (c: string) => c }));

import { processMessage } from '@/services/chat/message-processor';
import { __resetHermesProviderForTests, invalidateHermesConversation } from '@/services/chat/providers/hermes-provider';

const TOKEN = '11111111-1111-4111-8111-111111111111';
const MID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const hermesUser = { id: 'u1', preferred_backend: 'hermes' };
const httpError = (body: any) => ({ data: null, error: { message: 'non-2xx', context: { json: async () => body } } });
const run = () => processMessage({ message: 'hi', clientMessageId: MID, isAuthenticated: true, userProfile: hermesUser });

beforeEach(() => {
  invoke.mockReset(); webhook.mockReset(); __resetHermesProviderForTests();
  webhook.mockResolvedValue({ request: {}, response: { text: 'WEBHOOK FALLBACK' } });
});

const stateOn = () => invoke.mockResolvedValueOnce({ data: { enabled: true, conversation_token: TOKEN, generation: 1 }, error: null });
const stateOff = () => invoke.mockResolvedValueOnce({ data: { enabled: false }, error: null });

describe('Hermes routing (switch on)', () => {
  it('send throws -> error shown, zero webhook calls', async () => {
    stateOn(); invoke.mockRejectedValueOnce(new Error('network down'));
    await expect(run()).rejects.toThrow();
    expect(webhook).not.toHaveBeenCalled();
  });
  it('unlabelled error -> error shown, zero webhook calls', async () => {
    stateOn(); invoke.mockResolvedValueOnce(httpError({ code: 'unauthorized', error: 'Invalid token' }));
    await expect(run()).rejects.toThrow();
    expect(webhook).not.toHaveBeenCalled();
  });
  it('malformed response -> error shown, zero webhook calls', async () => {
    stateOn(); invoke.mockResolvedValueOnce({ data: { nope: 1 }, error: null });
    await expect(run()).rejects.toThrow();
    expect(webhook).not.toHaveBeenCalled();
  });
  it('status check fails opaquely -> error shown, zero webhook calls', async () => {
    invoke.mockRejectedValueOnce(new Error('offline'));
    await expect(run()).rejects.toThrow();
    expect(webhook).not.toHaveBeenCalled();
  });
  it.each(['hermes_not_selected', 'hermes_not_allowed'])('%s -> one webhook call', async (code) => {
    invoke.mockResolvedValueOnce(httpError({ code, error: 'x' }));
    const r = await run();
    expect(webhook).toHaveBeenCalledTimes(1);
    expect(r.content).toBe('WEBHOOK FALLBACK');
  });
  it('another tab clears while reply in flight -> reply not inserted', async () => {
    stateOn();
    invoke.mockImplementationOnce(async () => { invalidateHermesConversation(); return { data: { content: 'old reply', continuity: true }, error: null }; });
    const onComplete = vi.fn();
    await expect(processMessage({ message: 'hi', clientMessageId: MID, isAuthenticated: true, userProfile: hermesUser, onMessageComplete: onComplete })).rejects.toThrow(/reset/);
    expect(onComplete).not.toHaveBeenCalled();
    expect(webhook).not.toHaveBeenCalled();
  });
  it('normal reply is shown', async () => {
    stateOn(); invoke.mockResolvedValueOnce({ data: { content: 'hello', continuity: true }, error: null });
    expect((await run()).content).toBe('hello');
  });
});

describe('Hermes routing (switch off) keeps today’s fallback', () => {
  it('upstream error -> one webhook call', async () => {
    stateOff(); invoke.mockResolvedValueOnce(httpError({ code: 'upstream_error', error: 'Hermes returned 500' }));
    await run();
    expect(webhook).toHaveBeenCalledTimes(1);
  });
});
