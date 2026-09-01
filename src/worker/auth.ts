// Signed magic-link tokens: `<participantId>.<base64url(HMAC-SHA256(incidentId:participantId))>`.
// Demo-only identity, deliberately pluggable — see README.

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
}

export async function signParticipantToken(
  secret: string, incidentId: string, participantId: string,
): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${incidentId}:${participantId}`));
  return `${participantId}.${base64url(new Uint8Array(sig))}`;
}

export async function verifyParticipantToken(
  secret: string, incidentId: string, token: string,
): Promise<string | null> {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const participantId = token.slice(0, dot);
  const expected = await signParticipantToken(secret, incidentId, participantId);
  return timingSafeEqual(expected, token) ? participantId : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
