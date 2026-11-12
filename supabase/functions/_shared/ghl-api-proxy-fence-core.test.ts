import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fenceProxyRequest } from './ghl-api-proxy-fence-core.ts';

Deno.test('every write method is refused', () => {
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'post']) {
    assertEquals(fenceProxyRequest(m, '/contacts/'), { ok: false, status: 403, code: 'PROXY_WRITES_DISABLED' });
  }
});
Deno.test('allowlisted reads pass', () => {
  assertEquals(fenceProxyRequest('GET', '/contacts/').ok, true);
  assertEquals(fenceProxyRequest('GET', '/contacts/abc123?x=1').ok, true);
  assertEquals(fenceProxyRequest(undefined, '/locations/YZQCL96jxM5knY233VD4').ok, true);
});
Deno.test('other reads and tricks are refused', () => {
  assertEquals(fenceProxyRequest('GET', '/invoices/').ok, false);
  assertEquals(fenceProxyRequest('GET', '/contacts/abc/tasks').ok, false);
  assertEquals(fenceProxyRequest('GET', '/contacts/../users').ok, false);
  assertEquals(fenceProxyRequest('GET', 'https://evil.example/contacts/').ok, false);
});
