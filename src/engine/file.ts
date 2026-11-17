import { z } from 'zod';
import { decrypt, deriveKey, encrypt, fromBase64, type SessionKey } from './crypto';
import { migrate } from './migrate';
import { CURRENT_VERSION, parseProfile, type Profile } from './schema';

export type OpenResult =
  | { kind: 'ok'; profile: Profile; key?: SessionKey }
  | { kind: 'needs-passphrase' }
  | { kind: 'wrong-passphrase' }
  | { kind: 'invalid'; issues: string[] }
  | { kind: 'newer-version'; version: number };

const Envelope = z.strictObject({
  format: z.literal('zakat-helper'),
  encrypted: z.strictObject({
    kdf: z.literal('PBKDF2-SHA-256'),
    iterations: z.int().min(1),
    salt: z.base64(),
    iv: z.base64(),
    ciphertext: z.base64(),
  }),
});

const Versioned = z.looseObject({ format: z.literal('zakat-helper'), version: z.int().min(0) });

/** Pure: next revision, saved now. The caller keeps the returned profile in memory. */
export function stamp(p: Profile, now: string): Profile {
  return { ...p, meta: { ...p.meta, revision: p.meta.revision + 1, savedAt: now } };
}

/** No clock, no stamping. Encrypts when a session key is given. */
export async function serialise(p: Profile, key?: SessionKey): Promise<string> {
  const json = JSON.stringify(p, null, 2);
  if (!key) return json;
  return JSON.stringify({ format: 'zakat-helper', encrypted: await encrypt(key, json) }, null, 2);
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export async function openFile(text: string, passphrase?: string): Promise<OpenResult> {
  const outer = parseJson(text);
  if (!outer.ok)
    return {
      kind: 'invalid',
      issues: ['The file is not valid JSON. It may be cut short or damaged.'],
    };

  let raw = outer.value;
  let key: SessionKey | undefined;

  const env = Envelope.safeParse(raw);
  if (env.success) {
    if (passphrase === undefined) return { kind: 'needs-passphrase' };
    const e = env.data.encrypted;
    key = await deriveKey(passphrase, fromBase64(e.salt), e.iterations);
    let plain: string;
    try {
      plain = await decrypt(key.key, e);
    } catch {
      return { kind: 'wrong-passphrase' };
    }
    const inner = parseJson(plain);
    if (!inner.ok) return { kind: 'invalid', issues: ['The decrypted file is not valid JSON.'] };
    raw = inner.value;
  }

  const head = Versioned.safeParse(raw);
  if (!head.success) return { kind: 'invalid', issues: ['This is not a Zakat Helper file.'] };
  if (head.data.version > CURRENT_VERSION)
    return { kind: 'newer-version', version: head.data.version };

  let migrated: unknown;
  try {
    migrated = migrate(head.data);
  } catch (err) {
    return { kind: 'invalid', issues: [err instanceof Error ? err.message : String(err)] };
  }
  const parsed = parseProfile(migrated);
  if (!parsed.ok) return { kind: 'invalid', issues: parsed.issues };
  return key
    ? { kind: 'ok', profile: parsed.profile, key }
    : { kind: 'ok', profile: parsed.profile };
}
