import { describe, expect, it } from 'vitest';
import { deriveKey } from './crypto';
import { openFile, serialise, stamp } from './file';
import { migrate } from './migrate';
import { sampleProfile } from './testing/sample';

// Low iteration count keeps tests fast; the real default is exercised in one test below.
const FAST = 1000;

describe('stamp', () => {
  it('bumps the revision and sets savedAt without touching anything else', () => {
    const p = sampleProfile();
    const s = stamp(p, '2026-03-02T09:00:00.000Z');
    expect(s.meta).toEqual({
      ...p.meta,
      revision: p.meta.revision + 1,
      savedAt: '2026-03-02T09:00:00.000Z',
    });
    expect({ ...s, meta: p.meta }).toEqual(p);
  });
});

describe('openFile', () => {
  it('round-trips a plain file', async () => {
    const text = await serialise(sampleProfile());
    expect(await openFile(text)).toEqual({ kind: 'ok', profile: sampleProfile() });
  });

  it('round-trips an encrypted file and returns the key for re-saving', async () => {
    const key = await deriveKey('correct horse', undefined, FAST);
    const text = await serialise(sampleProfile(), key);
    expect(text).not.toContain('Al Rajhi');
    const r = await openFile(text, 'correct horse');
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.profile).toEqual(sampleProfile());
      expect(r.key?.iterations).toBe(FAST);
    }
  });

  it('asks for a passphrase when the file is encrypted', async () => {
    const text = await serialise(sampleProfile(), await deriveKey('pw', undefined, FAST));
    expect(await openFile(text)).toEqual({ kind: 'needs-passphrase' });
  });

  it('reports a wrong passphrase', async () => {
    const text = await serialise(sampleProfile(), await deriveKey('pw', undefined, FAST));
    expect(await openFile(text, 'not pw')).toEqual({ kind: 'wrong-passphrase' });
  });

  it('never yields a profile from tampered ciphertext', async () => {
    const text = await serialise(sampleProfile(), await deriveKey('pw', undefined, FAST));
    const env = JSON.parse(text) as { encrypted: { ciphertext: string } };
    const c = env.encrypted.ciphertext;
    env.encrypted.ciphertext = (c[0] === 'A' ? 'B' : 'A') + c.slice(1);
    const r = await openFile(JSON.stringify(env), 'pw');
    expect(r.kind).not.toBe('ok');
  });

  it('refuses a file from a newer version of the app', async () => {
    const text = JSON.stringify({ ...sampleProfile(), version: 999 });
    expect(await openFile(text)).toEqual({ kind: 'newer-version', version: 999 });
  });

  it('refuses truncated JSON', async () => {
    const text = (await serialise(sampleProfile())).slice(0, 200);
    const r = await openFile(text);
    expect(r.kind).toBe('invalid');
  });

  it('refuses a JSON file that is not a zakat-helper file', async () => {
    expect((await openFile('{"hello":"world"}')).kind).toBe('invalid');
    expect((await openFile('[1,2,3]')).kind).toBe('invalid');
  });

  it('refuses a hand-edited file with a bad amount, naming the field', async () => {
    const p = sampleProfile() as unknown as { checkpoints: { entries: { amount?: unknown }[] }[] };
    const e = p.checkpoints[0]?.entries[0];
    if (e) e.amount = '95,000';
    const r = await openFile(JSON.stringify(p));
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') expect(r.issues.join('\n')).toContain('amount');
  });
});

describe('deriveKey', () => {
  it('defaults to the OWASP 600,000 iterations', async () => {
    const k = await deriveKey('pw');
    expect(k.iterations).toBe(600_000);
    expect(k.salt).toHaveLength(16);
  });
});

describe('migrate', () => {
  it('runs each step up to the current version', () => {
    const steps = {
      0: (raw: Record<string, unknown>) => ({ ...raw, version: 1, migratedFrom0: true }),
    };
    expect(migrate({ version: 0, a: 1 }, steps)).toEqual({ version: 1, a: 1, migratedFrom0: true });
  });

  it('fails loudly when a step is missing', () => {
    expect(() => migrate({ version: 0 }, {})).toThrow(/version 0/);
  });
});
