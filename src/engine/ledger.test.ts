import { describe, expect, it } from 'vitest';
import {
  canPayInAdvance,
  finaliseCheckpoint,
  outstandingYears,
  reopenCheckpoint,
  yearStatus,
} from './ledger';
import type { Checkpoint, Payment, Profile } from './schema';
import { DEFAULT_SETTINGS } from './schema';

const NOW = '2026-03-02T09:00:00Z';

function cp(id: string, date: string, amount: string): Checkpoint {
  return {
    id,
    date,
    baseCurrency: 'SAR',
    prices: { fx: {}, metalPerGramPure: { gold: '400', silver: '5' }, perHolding: {} },
    entries: [{ kind: 'cash', holdingId: 'rajhi', amount }],
    heldNisabAtPrevious: true,
    status: 'draft',
  };
}

function pay(
  id: string,
  baseValue: string,
  appliesTo: Payment['appliesTo'],
  date = '2026-03-03',
): Payment {
  return {
    id,
    date,
    recipientId: 'r',
    sent: { amount: baseValue, currency: 'SAR' },
    baseValue,
    appliesTo,
  };
}

function profile(checkpoints: Checkpoint[], payments: Payment[] = []): Profile {
  return {
    format: 'zakat-helper',
    version: 1,
    meta: { profileId: '6f1c2b8e-3a4d-4c5e-9f60-7a8b9c0d1e2f', revision: 0, savedAt: null },
    settings: { ...DEFAULT_SETTINGS, deductUnpaidPriorZakat: false },
    holdings: [{ id: 'rajhi', kind: 'cash', name: 'Al Rajhi', currency: 'SAR' }],
    checkpoints,
    payments,
    recipients: [{ id: 'r', name: 'Recipient' }],
  };
}

function finalise(p: Profile, id: string): Profile {
  const r = finaliseCheckpoint(p, id, NOW);
  if (r.kind !== 'finalised') throw new Error(`could not finalise ${id}: ${r.kind}`);
  return r.profile;
}

const toY = (checkpointId: string) => ({ kind: 'checkpoint' as const, checkpointId });

describe('yearStatus', () => {
  it('is draft until the year is finished', () => {
    expect(yearStatus(profile([cp('y', '2026-03-01', '100000')]), 'y')).toEqual({ state: 'draft' });
  });

  it('sums several payments against the due', () => {
    // 100,000 -> due 2,500
    let p = profile(
      [cp('y', '2026-03-01', '100000')],
      [pay('a', '1000', toY('y')), pay('b', '750', toY('y')), pay('c', '500', toY('y'))],
    );
    p = finalise(p, 'y');
    expect(yearStatus(p, 'y')).toEqual({
      state: 'due',
      due: '2500',
      paid: '2250',
      remaining: '250',
    });
  });

  it('is settled when payments reach exactly the due', () => {
    let p = profile([cp('y', '2026-03-01', '100000')], [pay('a', '2500', toY('y'))]);
    p = finalise(p, 'y');
    expect(yearStatus(p, 'y')).toEqual({ state: 'settled', due: '2500', paid: '2500' });
  });

  it('shows an overpayment as such', () => {
    let p = profile([cp('y', '2026-03-01', '100000')], [pay('a', '3000', toY('y'))]);
    p = finalise(p, 'y');
    expect(yearStatus(p, 'y')).toEqual({
      state: 'overpaid',
      due: '2500',
      paid: '3000',
      over: '500',
    });
  });

  it('shows a year below nisab as nothing due, not settled', () => {
    let p = profile([cp('y', '2026-03-01', '1000')]);
    p = finalise(p, 'y');
    expect(yearStatus(p, 'y')).toEqual({ state: 'nothing-due', reason: 'below-nisab' });
  });
});

describe('finaliseCheckpoint', () => {
  it('freezes the result so later settings changes do not rewrite history', () => {
    let p = finalise(profile([cp('y', '2026-03-01', '100000')]), 'y');
    p = { ...p, settings: { ...p.settings, yearType: 'solar' } };
    expect(yearStatus(p, 'y')).toMatchObject({ due: '2500' });
  });

  it('refuses when inputs are missing and lists them', () => {
    const c = { ...cp('y', '2026-03-01', '100000'), heldNisabAtPrevious: undefined };
    const p = profile([c]);
    expect(finaliseCheckpoint(p, 'y', NOW)).toEqual({
      kind: 'missing',
      missing: [{ kind: 'first-year-answer' }],
    });
  });

  it('refuses to finalise twice', () => {
    const p = finalise(profile([cp('y', '2026-03-01', '100000')]), 'y');
    expect(finaliseCheckpoint(p, 'y', NOW)).toEqual({ kind: 'already-finalised' });
  });

  it('attaches advance payments when finishing the latest year', () => {
    let p = finalise(profile([cp('y1', '2025-03-11', '100000')]), 'y1');
    p = {
      ...p,
      checkpoints: [...p.checkpoints, cp('y2', '2026-03-01', '100000')],
      payments: [pay('adv', '1000', { kind: 'advance' }, '2025-12-01')],
    };
    p = finalise(p, 'y2');
    expect(p.payments[0]?.appliesTo).toEqual(toY('y2'));
    expect(yearStatus(p, 'y2')).toMatchObject({ paid: '1000' });
  });

  it('does not hand advance payments to an earlier year entered after the fact', () => {
    let p = finalise(profile([cp('y2', '2026-03-01', '100000')]), 'y2');
    p = {
      ...p,
      checkpoints: [...p.checkpoints, cp('y1', '2025-03-11', '100000')],
      payments: [pay('adv', '1000', { kind: 'advance' })],
    };
    p = finalise(p, 'y1');
    expect(p.payments[0]?.appliesTo).toEqual({ kind: 'advance' });
  });
});

describe('reopenCheckpoint', () => {
  it('returns a finished year to draft', () => {
    const p = reopenCheckpoint(finalise(profile([cp('y', '2026-03-01', '100000')]), 'y'), 'y');
    expect(p.checkpoints[0]?.status).toBe('draft');
    expect(p.checkpoints[0]).not.toHaveProperty('frozen');
  });
});

describe('outstandingYears', () => {
  it('lists years with something left, oldest first', () => {
    let p = profile(
      [
        cp('y2', '2026-03-01', '100000'),
        cp('y1', '2025-03-11', '40000'),
        cp('y0', '2024-03-21', '40000'),
      ],
      [pay('a', '1000', toY('y0'))],
    );
    p = finalise(finalise(finalise(p, 'y0'), 'y1'), 'y2');
    expect(outstandingYears(p)).toEqual([
      { checkpointId: 'y1', remaining: '1000' },
      { checkpointId: 'y2', remaining: '2500' },
    ]);
  });
});

describe('canPayInAdvance', () => {
  it('needs a finished year at or above nisab', () => {
    expect(canPayInAdvance(profile([cp('y', '2026-03-01', '100000')]))).toBe(false);
    expect(canPayInAdvance(finalise(profile([cp('y', '2026-03-01', '100000')]), 'y'))).toBe(true);
    expect(canPayInAdvance(finalise(profile([cp('y', '2026-03-01', '1000')]), 'y'))).toBe(false);
  });
});

describe('advance payments and nothing-due years', () => {
  it('leaves advance payments as advance when the finished year has nothing due', () => {
    let p = profile([cp('y1', '2025-03-11', '100000')]);
    p = finalise(p, 'y1');
    p = {
      ...p,
      checkpoints: [...p.checkpoints, cp('y2', '2026-03-01', '1000')],
      payments: [pay('adv', '500', { kind: 'advance' }, '2025-12-01')],
    };
    p = finalise(p, 'y2');
    expect(p.payments[0]?.appliesTo).toEqual({ kind: 'advance' });
  });
});
