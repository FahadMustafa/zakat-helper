import { describe, expect, it } from 'vitest';
import { finaliseCheckpoint } from '../../engine/ledger';
import type { Profile } from '../../engine/schema';
import { sampleProfile } from '../../engine/testing/sample';
import {
  addHolding,
  closeHolding,
  currenciesInUse,
  insertMissingYear,
  metalsNeeded,
  startCheckpoint,
} from './draft';

function finalisedSample(): Profile {
  const r = finaliseCheckpoint(sampleProfile(), 'cp-1447', '2026-03-02T00:00:00Z');
  if (r.kind !== 'finalised') throw new Error(r.kind);
  return r.profile;
}

describe('startCheckpoint', () => {
  it('copies last year forward one Hijri year later, with prices left to fill', () => {
    const p = startCheckpoint(finalisedSample(), 'cp-1448', '2026-11-17');
    const c = p.checkpoints.find((x) => x.id === 'cp-1448');
    expect(c?.date).toBe('2027-02-18'); // 2026-03-01 + 354 days
    expect(c?.status).toBe('draft');
    expect(c?.entries).toEqual(sampleProfile().checkpoints[0]?.entries);
    expect(c?.prices).toEqual({ fx: {}, metalPerGramPure: {}, perHolding: {} });
    expect(c?.heldNisabAtPrevious).toBeUndefined();
  });

  it('uses 365 days for a Gregorian zakat year', () => {
    const base = finalisedSample();
    const p = startCheckpoint(
      { ...base, settings: { ...base.settings, yearType: 'solar' } },
      'n',
      '2026-11-17',
    );
    expect(p.checkpoints.find((x) => x.id === 'n')?.date).toBe('2027-03-01');
  });

  it('starts empty on today for the first year', () => {
    const empty: Profile = { ...sampleProfile(), holdings: [], checkpoints: [] };
    const p = startCheckpoint(empty, 'first', '2026-11-17');
    expect(p.checkpoints).toEqual([
      {
        id: 'first',
        date: '2026-11-17',
        baseCurrency: 'SAR',
        prices: { fx: {}, metalPerGramPure: {}, perHolding: {} },
        entries: [],
        status: 'draft',
      },
    ]);
  });

  it('leaves out holdings closed before the new date', () => {
    const base = finalisedSample();
    const closed = closeHolding(base, 'cp-1447', 'rajhi');
    const p = startCheckpoint(closed, 'n', '2026-11-17');
    expect(
      p.checkpoints.find((x) => x.id === 'n')?.entries.some((e) => e.holdingId === 'rajhi'),
    ).toBe(false);
  });
});

describe('addHolding', () => {
  it('adds the holding and a starting entry with safe defaults', () => {
    const p = addHolding(sampleProfile(), 'cp-1447', {
      id: 'new',
      kind: 'shares',
      name: 'Aramco',
      currency: 'SAR',
    });
    expect(p.holdings.at(-1)).toEqual({
      id: 'new',
      kind: 'shares',
      name: 'Aramco',
      currency: 'SAR',
    });
    expect(p.checkpoints[0]?.entries.at(-1)).toEqual({
      kind: 'shares',
      holdingId: 'new',
      count: '0',
      treatment: { kind: 'trading' },
      companyPaysZakat: false,
    });
  });
});

describe('closeHolding', () => {
  it('removes the entry from this year and marks the holding closed on that date', () => {
    const p = closeHolding(sampleProfile(), 'cp-1447', 'snb');
    expect(p.checkpoints[0]?.entries.some((e) => e.holdingId === 'snb')).toBe(false);
    expect(p.holdings.find((h) => h.id === 'snb')?.closedAt).toBe('2026-03-01');
  });
});

describe('what prices a checkpoint needs', () => {
  it('lists foreign currencies of holdings with entries', () => {
    expect(currenciesInUse(sampleProfile(), 'cp-1447')).toEqual(['USD']);
  });

  it('needs the nisab metal plus any metal held', () => {
    const p = sampleProfile();
    expect(metalsNeeded(p, 'cp-1447')).toEqual(['gold', 'silver']);
    const cashOnly: Profile = {
      ...p,
      checkpoints: p.checkpoints.map((c) => ({
        ...c,
        entries: c.entries.filter((e) => e.kind === 'cash'),
      })),
    };
    expect(metalsNeeded(cashOnly, 'cp-1447')).toEqual(['silver']);
  });
});

describe('insertMissingYear', () => {
  it('adds a draft one zakat year after the earlier checkpoint, copied from it', () => {
    const base = finalisedSample(); // cp-1447 on 2026-03-01
    const later = startCheckpoint(base, 'late', '2028-01-01');
    const moved: Profile = {
      ...later,
      checkpoints: later.checkpoints.map((c) =>
        c.id === 'late' ? { ...c, date: '2028-01-20' } : c,
      ),
    };
    const p = insertMissingYear(moved, 'late', 'gap');
    const gap = p.checkpoints.find((c) => c.id === 'gap');
    expect(gap?.date).toBe('2027-02-18');
    expect(gap?.entries).toEqual(sampleProfile().checkpoints[0]?.entries);
    expect(gap?.status).toBe('draft');
  });
});
