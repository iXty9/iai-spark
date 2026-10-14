// Same AES-GCM scheme as ghl-token-refresh decryptToken (IV = first 12 bytes).
export async function decryptToken(encryptedData: string, key: string): Promise<string> {
  const keyData = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
  const k = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
  const all = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  if (all.length < 13) throw new Error('ciphertext_too_short');
  const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, k, all.slice(12));
  return new TextDecoder('utf-8', { fatal: true }).decode(out);
}
