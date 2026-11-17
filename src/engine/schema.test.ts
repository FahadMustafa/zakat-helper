import { describe, expect, it } from 'vitest';
import { parseProfile } from './schema';
import { sampleProfile } from './testing/sample';

function expectIssue(raw: unknown, pathFragment: string) {
  const r = parseProfile(raw);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.issues.join('\n')).toContain(pathFragment);
}

describe('parseProfile', () => {
  it('accepts a profile with every holding kind and round-trips through JSON', () => {
    const r = parseProfile(JSON.parse(JSON.stringify(sampleProfile())));
    expect(r).toEqual({ ok: true, profile: sampleProfile() });
  });

  it('rejects an unknown holding kind, naming the path', () => {
    const p = sampleProfile() as unknown as { holdings: { kind: string }[] };
    p.holdings[0] = { ...p.holdings[0], kind: 'bitcoin' };
    expectIssue(p, 'holdings.0');
  });

  it('rejects a missing required field, naming the path', () => {
    const p = sampleProfile() as unknown as { checkpoints: { date?: string }[] };
    delete p.checkpoints[0]?.date;
    expectIssue(p, 'checkpoints.0.date');
  });

  it('rejects amounts written with grouping separators or floats', () => {
    const p = sampleProfile();
    const e = p.checkpoints[0]?.entries[0];
    if (e?.kind !== 'cash') throw new Error('fixture changed');
    (e as { amount: unknown }).amount = 95000.5;
    expectIssue(p, 'amount');
  });

  it('rejects an entry whose kind does not match its holding', () => {
    const p = sampleProfile();
    p.checkpoints[0]?.entries.push({ kind: 'cash', holdingId: 'bars', amount: '1' });
    expectIssue(p, 'does not match holding');
  });

  it('rejects an entry for a holding that does not exist', () => {
    const p = sampleProfile();
    p.checkpoints[0]?.entries.push({ kind: 'cash', holdingId: 'ghost', amount: '1' });
    expectIssue(p, 'unknown holding "ghost"');
  });

  it('rejects two entries for the same holding in one checkpoint', () => {
    const p = sampleProfile();
    p.checkpoints[0]?.entries.push({ kind: 'cash', holdingId: 'rajhi', amount: '1' });
    expectIssue(p, 'more than once');
  });

  it('rejects a karat outside 1-24', () => {
    const p = sampleProfile();
    const e = p.checkpoints[0]?.entries.find((x) => x.kind === 'gold');
    if (e?.kind !== 'gold') throw new Error('fixture changed');
    e.karat = 25;
    expectIssue(p, 'karat');
  });

  it('rejects a long-term fraction above 1', () => {
    const p = sampleProfile();
    const e = p.checkpoints[0]?.entries.find((x) => x.kind === 'shares');
    if (e?.kind !== 'shares') throw new Error('fixture changed');
    e.treatment = { kind: 'long-term', zakatableFraction: '1.5' };
    expectIssue(p, 'zakatableFraction');
  });

  it('rejects a payment to an unknown recipient or checkpoint', () => {
    const p = sampleProfile();
    p.payments.push({
      id: 'p1',
      date: '2026-03-03',
      recipientId: 'nobody',
      sent: { amount: '100', currency: 'SAR' },
      baseValue: '100',
      appliesTo: { kind: 'checkpoint', checkpointId: 'cp-none' },
    });
    expectIssue(p, 'unknown recipient "nobody"');
    expectIssue(p, 'unknown checkpoint "cp-none"');
  });

  it('rejects unknown top-level keys', () => {
    expectIssue({ ...sampleProfile(), extra: 1 }, 'extra');
  });

  it('rejects amounts with more than 18 decimal places (the engine cannot hold them)', () => {
    const p = sampleProfile();
    const e = p.checkpoints[0]?.entries[0];
    if (e?.kind !== 'cash') throw new Error('fixture changed');
    e.amount = '1.0000000000000000001';
    expectIssue(p, 'amount');
  });

  it('rejects checkpoints in different base currencies', () => {
    const p = sampleProfile();
    const c = p.checkpoints[0];
    if (!c) throw new Error('fixture changed');
    p.checkpoints.push({ ...c, id: 'cp-2', date: '2027-02-18', baseCurrency: 'GBP' });
    expectIssue(p, 'base currency');
  });
});
