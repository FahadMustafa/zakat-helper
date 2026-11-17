// Passphrase encryption with WebCrypto only, so the same code runs in the browser and in Node 22.

/** OWASP Password Storage Cheat Sheet: PBKDF2-HMAC-SHA256, 600,000 iterations. */
export const PBKDF2_ITERATIONS = 600_000;

/** Typed from the API so it resolves under both the DOM and Node lib typings. */
type CryptoKey = Awaited<ReturnType<typeof crypto.subtle.importKey>>;

export type SessionKey = { key: CryptoKey; salt: Uint8Array<ArrayBuffer>; iterations: number };

export type EncryptedBlob = {
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Derive once per session; the salt and iteration count travel with the file. */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(16)),
  iterations: number = PBKDF2_ITERATIONS,
): Promise<SessionKey> {
  if (passphrase.length === 0) throw new Error('Passphrase must not be empty');
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return { key, salt, iterations };
}

export async function encrypt(k: SessionKey, plaintext: string): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    k.key,
    new TextEncoder().encode(plaintext),
  );
  return {
    kdf: 'PBKDF2-SHA-256',
    iterations: k.iterations,
    salt: toBase64(k.salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ct)),
  };
}

/** Throws when the key is wrong or the ciphertext was altered (AES-GCM authenticates both). */
export async function decrypt(key: CryptoKey, blob: EncryptedBlob): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(blob.iv) },
    key,
    fromBase64(blob.ciphertext),
  );
  return new TextDecoder().decode(pt);
}
