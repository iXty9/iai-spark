import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { userTypeForClass, validateRefreshResponse } from './ghl-token-manager.ts';

Deno.test('sub-account pass made from agency pass refreshes as Location', () => {
  assertEquals(userTypeForClass('derived_location'), 'Location');
  assertEquals(userTypeForClass('native_location'), 'Location');
  assertEquals(userTypeForClass('company_parent'), 'Company');
});

Deno.test('refresh response must rotate the refresh token', () => {
  assertEquals(
    validateRefreshResponse({ access_token: 'a', refresh_token: 'old', expires_in: 86399 }, 'old'),
    'refresh token was not rotated',
  );
});

Deno.test('valid refresh response is accepted', () => {
  assertEquals(validateRefreshResponse({ access_token: 'a', refresh_token: 'new', expires_in: 86399 }, 'old'), null);
});

Deno.test('missing expires_in is rejected', () => {
  assertEquals(validateRefreshResponse({ access_token: 'a', refresh_token: 'new' }, 'old'), 'invalid expires_in');
});
