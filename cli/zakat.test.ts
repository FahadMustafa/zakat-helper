import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeCheckpoint } from '../src/engine/calculate';
import { sampleProfile } from '../src/engine/testing/sample';
import { profileFromInput } from './input';

const BUNDLE = 'skills/zakat/scripts/zakat.mjs';

function runBundle(args: string[], env: Record<string, string> = {}): unknown {
  const out = execFileSync('node', [BUNDLE, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return JSON.parse(out) as unknown;
}

function tempFile(name: string, content: string): string {
  const path = join(mkdtempSync(join(tmpdir(), 'zakat-cli-')), name);
  writeFileSync(path, content);
  return path;
}

describe('zakat CLI bundle', () => {
  it('gives the same result as the engine for a saved profile', () => {
    const p = sampleProfile();
    const out = runBundle([tempFile('profile.json', JSON.stringify(p))]) as { result: unknown };
    expect(out.result).toEqual(computeCheckpoint(p, 'cp-1447'));
  });

  it('works from the minimal input documented in SKILL.md', () => {
    const input = {
      date: '2026-03-01',
      baseCurrency: 'SAR',
      heldNisabAtPreviousZakatDate: true,
      prices: { fx: { USD: '3.75' }, goldPerGramPure: '400', silverPerGramPure: '5' },
      holdings: [
        { name: 'Al Rajhi current account', kind: 'cash', currency: 'SAR', amount: '95000' },
        { name: 'HSBC dollar account', kind: 'cash', currency: 'USD', amount: '18000' },
        { name: 'Gold bars', kind: 'gold', grams: '100', karat: 21, personalJewellery: false },
      ],
    };
    const out = runBundle(['--input', tempFile('input.json', JSON.stringify(input))]) as {
      result: { ok: boolean; outcome: unknown };
    };
    // 95,000 + 67,500 + 35,000 = 197,500 x 2.5% = 4,937.50
    expect(out.result.outcome).toEqual({ kind: 'due', due: '4937.5' });
  });

  it('exits non-zero with a message for an encrypted file without ZAKAT_PASSPHRASE', () => {
    const encrypted = JSON.stringify({
      format: 'zakat-helper',
      encrypted: {
        kdf: 'PBKDF2-SHA-256',
        iterations: 1000,
        salt: 'AAAA',
        iv: 'AAAA',
        ciphertext: 'AAAA',
      },
    });
    expect(() => runBundle([tempFile('enc.json', encrypted)], { ZAKAT_PASSPHRASE: '' })).toThrow(
      /ZAKAT_PASSPHRASE/,
    );
  });
});

describe('profileFromInput', () => {
  it('rejects an unknown holding kind with the field path', () => {
    const r = profileFromInput({
      date: '2026-03-01',
      baseCurrency: 'SAR',
      heldNisabAtPreviousZakatDate: true,
      prices: {},
      holdings: [{ name: 'x', kind: 'bitcoin' }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join('\n')).toContain('holdings.0');
  });
});
