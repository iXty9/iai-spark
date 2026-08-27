import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { verifyGHLSignature } from "./ghl-signature-verify.ts";

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function signEd25519(body: string) {
  const keyPair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const sig = await crypto.subtle.sign(
    "Ed25519",
    keyPair.privateKey,
    new TextEncoder().encode(body),
  );
  return toBase64(sig);
}

const body = JSON.stringify({ type: "INSTALL", timestamp: new Date().toISOString() });

Deno.test("bypass short-circuits verification", async () => {
  const req = new Request("https://example.com", { method: "POST" });
  const result = await verifyGHLSignature(req, body, true);
  assertEquals(result.valid, true);
  assertEquals(result.bypassed, true);
});

Deno.test("missing both signature headers is rejected", async () => {
  const req = new Request("https://example.com", { method: "POST" });
  const result = await verifyGHLSignature(req, body, false);
  assertEquals(result.valid, false);
});

Deno.test("Ed25519 signature from a foreign key is rejected (not crashed)", async () => {
  // Signed with a random keypair, so it must fail against GHL's public key —
  // this proves the Ed25519 code path runs end to end without throwing.
  const signature = await signEd25519(body);
  const req = new Request("https://example.com", {
    method: "POST",
    headers: { "x-ghl-signature": signature },
  });
  const result = await verifyGHLSignature(req, body, false);
  assertEquals(result.valid, false);
  assertEquals(result.error, "Invalid signature");
});

Deno.test("x-ghl-signature is preferred over legacy header", async () => {
  const signature = await signEd25519(body);
  const req = new Request("https://example.com", {
    method: "POST",
    headers: { "x-ghl-signature": signature, "x-wh-signature": "deadbeef" },
  });
  const result = await verifyGHLSignature(req, body, false);
  // Fails on signature (Ed25519 path chosen), not on a decode error from the legacy hex value.
  assertEquals(result.error, "Invalid signature");
});

Deno.test('x-ghl-signature of "N/A" falls back to legacy header', async () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: { "x-ghl-signature": "N/A", "x-wh-signature": "N/A" },
  });
  const result = await verifyGHLSignature(req, body, false);
  assertEquals(result.valid, false);
  assertEquals(result.error, "Missing x-ghl-signature (or legacy x-wh-signature) header");
});

Deno.test("stale timestamp is rejected before crypto", async () => {
  const oldBody = JSON.stringify({
    type: "INSTALL",
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  });
  const signature = await signEd25519(oldBody);
  const req = new Request("https://example.com", {
    method: "POST",
    headers: { "x-ghl-signature": signature },
  });
  const result = await verifyGHLSignature(req, oldBody, false);
  assertEquals(result.valid, false);
  assertEquals(result.error, "Webhook timestamp too old (replay protection)");
});
