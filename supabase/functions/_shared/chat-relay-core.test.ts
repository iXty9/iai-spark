import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { relayTimeoutMs, resolveTarget } from './chat-relay-core.ts';

const settings = {
  authenticated_webhook_url: 'https://n8n.ixty.ai/webhook/global-auth',
  anonymous_webhook_url: 'https://n8n.ixty.ai/webhook/global-anon',
  authenticated_webhook_url_use_auth: 'true',
  webhook_auth_header_name: 'X-Webhook-Token',
  webhook_auth_header_value: 'global-token',
};

const custom = (url: string) => ({
  webhook_url: url,
  custom_webhook_enabled: true,
  custom_webhook_use_auth: true,
  custom_webhook_auth_header_name: 'X-Custom',
  custom_webhook_auth_header_value: 'custom-token',
});

Deno.test('signed-in user without custom address uses the global address and global token', () => {
  const r = resolveTarget(settings, null);
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.url, 'https://n8n.ixty.ai/webhook/global-auth');
    assertEquals(r.authHeaders, { 'X-Webhook-Token': 'global-token' });
  }
});

Deno.test('custom address on the same n8n host is used with its own token only', () => {
  const r = resolveTarget(settings, custom('https://n8n.ixty.ai/webhook/b1f3b73e'));
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.isCustom, true);
    assertEquals(r.authHeaders, { 'X-Custom': 'custom-token' });
  }
});

Deno.test('custom address on another host is refused', () => {
  assertEquals(resolveTarget(settings, custom('https://evil.example.com/webhook/x')).ok, false);
  assertEquals(resolveTarget(settings, custom('https://n8n.ixty.ai.evil.com/webhook/x')).ok, false);
  assertEquals(resolveTarget(settings, custom('http://n8n.ixty.ai/webhook/x')).ok, false);
  assertEquals(resolveTarget(settings, custom('https://n8n.ixty.ai:5679/webhook/x')).ok, false);
  assertEquals(resolveTarget(settings, custom('https://user:pw@n8n.ixty.ai/webhook/x')).ok, false);
  assertEquals(resolveTarget(settings, custom('https://n8n.ixty.ai/rest/workflows')).ok, false);
});

Deno.test('relay waits at most 140 seconds', () => {
  assertEquals(relayTimeoutMs('300000'), 140_000);
  assertEquals(relayTimeoutMs('60000'), 60_000);
  assertEquals(relayTimeoutMs(undefined), 140_000);
});
