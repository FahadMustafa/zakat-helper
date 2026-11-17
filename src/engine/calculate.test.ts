import { describe, expect, it } from 'vitest';
import { computeCheckpoint } from './calculate';
import { Dec } from './money';
import type { Checkpoint, Entry, Holding, OkResult, Payment, Profile, Settings } from './schema';
import { DEFAULT_SETTINGS } from './schema';

// ---------- builders ----------

type Prices = Checkpoint['prices'];
const PRICES: Prices = {
  fx: { USD: '3.75' },
  metalPerGramPure: { gold: '400', silver: '5' },
  perHolding: {},
};

const H: Record<string, Holding> = {
  rajhi: { id: 'rajhi', kind: 'cash', name: 'Al Rajhi', currency: 'SAR' },
  snb: { id: 'snb', kind: 'cash', name: 'SNB', currency: 'SAR' },
  hsbc: { id: 'hsbc', kind: 'cash', name: 'HSBC', currency: 'USD' },
  bars: { id: 'bars', kind: 'gold', name: 'Gold bars' },
  ring: { id: 'ring', kind: 'silver', name: 'Silver ring' },
  tasi: { id: 'tasi', kind: 'shares', name: 'Tadawul shares', currency: 'SAR' },
  plot: { id: 'plot', kind: 'property', name: 'Plot', currency: 'SAR' },
  loan: { id: 'loan', kind: 'receivable', name: 'Loan to a friend', currency: 'SAR' },
  card: { id: 'card', kind: 'liability', name: 'Credit card', currency: 'SAR' },
  pension: { id: 'pension', kind: 'other', name: 'Pension', currency: 'SAR' },
};

const cash = (holdingId: string, amount: string): Entry => ({ kind: 'cash', holdingId, amount });

function cp(
  id: string,
  date: string,
  entries: Entry[],
  extra: Partial<Omit<Extract<Checkpoint, { status: 'draft' }>, 'status'>> = {},
): Checkpoint {
  return {
    id,
    date,
    baseCurrency: 'SAR',
    prices: PRICES,
    entries,
    heldNisabAtPrevious: true,
    status: 'draft',
    ...extra,
  };
}

function profile(
  checkpoints: Checkpoint[],
  settings: Partial<Settings> = {},
  payments: Payment[] = [],
): Profile {
  return {
    format: 'zakat-helper',
    version: 1,
    meta: { profileId: '6f1c2b8e-3a4d-4c5e-9f60-7a8b9c0d1e2f', revision: 0, savedAt: null },
    settings: { ...DEFAULT_SETTINGS, ...settings },
    holdings: Object.values(H),
    checkpoints,
    payments,
    recipients: [{ id: 'r', name: 'Recipient' }],
  };
}

/** Finalise a checkpoint the simple way, for building history in tests. */
function freeze(p: Profile, id: string): Profile {
  const r = computeCheckpoint(p, id);
  if (!r.ok) throw new Error(`cannot freeze ${id}: ${JSON.stringify(r.missing)}`);
  return {
    ...p,
    checkpoints: p.checkpoints.map((c) =>
      c.id === id
        ? {
            ...c,
            status: 'finalised' as const,
            finalisedAt: '2026-01-01T00:00:00Z',
            frozen: { settings: p.settings, result: r },
          }
        : c,
    ),
  };
}

function ok(p: Profile, id: string): OkResult {
  const r = computeCheckpoint(p, id);
  if (!r.ok) throw new Error(`expected ok, got missing ${JSON.stringify(r.missing)}`);
  return r;
}

function due(r: OkResult): string {
  if (r.outcome.kind !== 'due') throw new Error(`expected due, got ${r.outcome.reason}`);
  return r.outcome.due;
}

const line = (r: OkResult, holdingId: string) => {
  const l = r.lines.find((x) => x.holdingId === holdingId);
  if (!l) throw new Error(`no line for ${holdingId}`);
  return l;
};

// ---------- tests ----------

describe('whole-balance rule (rules.md: Year rule)', () => {
  it('combines SAR and USD cash at the checkpoint rate (rules.md: Currencies)', () => {
    const r = ok(
      profile([cp('c', '2026-03-01', [cash('rajhi', '95000'), cash('hsbc', '18000')])]),
      'c',
    );
    expect(r.zakatableTotal).toBe('162500');
    expect(r.nisabThreshold).toBe('2975');
    expect(due(r)).toBe('4062.5');
  });

  it('silver nisab makes 10,000 SAR zakatable, gold nisab does not (rules.md: Nisab basis)', () => {
    const c = [cp('c', '2026-03-01', [cash('rajhi', '10000')])];
    expect(due(ok(profile(c, { nisabBasis: 'silver' }), 'c'))).toBe('250');
    const gold = ok(profile(c, { nisabBasis: 'gold' }), 'c');
    expect(gold.nisabThreshold).toBe('34000');
    expect(gold.outcome).toEqual({ kind: 'nothing-due', reason: 'below-nisab' });
  });

  it('values year 2 as nothing due when year 1 was below nisab', () => {
    let p = profile([
      cp('y1', '2025-03-11', [cash('rajhi', '1000')]),
      cp('y2', '2026-03-01', [cash('rajhi', '50000')], { heldNisabAtPrevious: undefined }),
    ]);
    p = freeze(p, 'y1');
    expect(ok(p, 'y2').outcome).toEqual({ kind: 'nothing-due', reason: 'no-nisab-at-previous' });
  });

  it('asks the first-year question when there is no previous checkpoint', () => {
    const p = profile([
      cp('c', '2026-03-01', [cash('rajhi', '50000')], { heldNisabAtPrevious: undefined }),
    ]);
    expect(computeCheckpoint(p, 'c')).toEqual({
      ok: false,
      missing: [{ kind: 'first-year-answer' }],
    });
  });

  it('first year answered "no" means nothing due yet', () => {
    const p = profile([
      cp('c', '2026-03-01', [cash('rajhi', '50000')], { heldNisabAtPrevious: false }),
    ]);
    expect(ok(p, 'c').outcome).toEqual({ kind: 'nothing-due', reason: 'no-nisab-at-previous' });
  });
});

describe('gold and silver (rules.md: Gold and silver, Personal jewellery)', () => {
  it('values 100 g of 21 karat gold on its pure content', () => {
    const r = ok(
      profile([
        cp('c', '2026-03-01', [
          { kind: 'gold', holdingId: 'bars', grams: '100', karat: 21, personalJewellery: false },
        ]),
      ]),
      'c',
    );
    expect(line(r, 'bars').zakatableValue).toBe('35000');
  });

  it('values 22 karat gold exactly, rounding only the due', () => {
    const r = ok(
      profile([
        cp('c', '2026-03-01', [
          { kind: 'gold', holdingId: 'bars', grams: '100', karat: 22, personalJewellery: false },
        ]),
      ]),
      'c',
    );
    expect(Dec.parse(line(r, 'bars').zakatableValue).round(6).toString()).toBe('36666.666667');
    expect(due(r)).toBe('916.67');
  });

  it('counts worn jewellery only when the setting says so', () => {
    const entries: Entry[] = [
      cash('rajhi', '10000'),
      { kind: 'silver', holdingId: 'ring', grams: '10', fineness: 925, personalJewellery: true },
    ];
    expect(line(ok(profile([cp('c', '2026-03-01', entries)]), 'c'), 'ring')).toMatchObject({
      zakatableValue: '46.25',
      reason: 'counted',
    });
    expect(
      line(
        ok(profile([cp('c', '2026-03-01', entries)], { jewelleryZakatable: false }), 'c'),
        'ring',
      ),
    ).toMatchObject({
      value: '46.25',
      zakatableValue: '0',
      reason: 'jewellery-exempt',
    });
  });
});

describe('shares, property, receivables, other (rules.md sections of the same name)', () => {
  it('counts 25% of long-term shares', () => {
    const r = ok(
      profile([
        cp(
          'c',
          '2026-03-01',
          [
            {
              kind: 'shares',
              holdingId: 'tasi',
              count: '1000',
              treatment: { kind: 'long-term', zakatableFraction: '0.25' },
              companyPaysZakat: false,
            },
          ],
          { prices: { ...PRICES, perHolding: { tasi: '40' } } },
        ),
      ]),
      'c',
    );
    expect(line(r, 'tasi')).toMatchObject({
      value: '40000',
      zakatableValue: '10000',
      reason: 'long-term-fraction',
    });
  });

  it('skips shares whose company pays zakat, without needing a price', () => {
    const r = ok(
      profile([
        cp('c', '2026-03-01', [
          cash('rajhi', '10000'),
          {
            kind: 'shares',
            holdingId: 'tasi',
            count: '500',
            treatment: { kind: 'trading' },
            companyPaysZakat: true,
          },
        ]),
      ]),
      'c',
    );
    expect(line(r, 'tasi')).toMatchObject({ zakatableValue: '0', reason: 'company-pays' });
  });

  it('ignores property not for sale and counts property for sale', () => {
    const notForSale = ok(
      profile([
        cp('c', '2026-03-01', [
          cash('rajhi', '10000'),
          { kind: 'property', holdingId: 'plot', forSale: false },
        ]),
      ]),
      'c',
    );
    expect(line(notForSale, 'plot')).toMatchObject({ zakatableValue: '0', reason: 'not-for-sale' });
    const forSale = ok(
      profile([
        cp('c', '2026-03-01', [{ kind: 'property', holdingId: 'plot', forSale: true }], {
          prices: { ...PRICES, perHolding: { plot: '500000' } },
        }),
      ]),
      'c',
    );
    expect(line(forSale, 'plot').zakatableValue).toBe('500000');
  });

  it('skips doubtful debts owed to you', () => {
    const r = ok(
      profile([
        cp('c', '2026-03-01', [
          cash('rajhi', '10000'),
          { kind: 'receivable', holdingId: 'loan', amount: '5000', collectable: false },
        ]),
      ]),
      'c',
    );
    expect(line(r, 'loan')).toMatchObject({ zakatableValue: '0', reason: 'doubtful-debt' });
  });

  it('skips a pension the user marked not zakatable', () => {
    const r = ok(
      profile([
        cp('c', '2026-03-01', [
          cash('rajhi', '10000'),
          {
            kind: 'other',
            holdingId: 'pension',
            amount: '40000',
            category: 'pension',
            zakatable: false,
          },
        ]),
      ]),
      'c',
    );
    expect(line(r, 'pension')).toMatchObject({
      zakatableValue: '0',
      reason: 'not-zakatable-by-user',
    });
    expect(r.zakatableTotal).toBe('10000');
  });
});

describe('deductions (rules.md: Debts you owe, Unpaid zakat)', () => {
  const entries: Entry[] = [
    cash('rajhi', '100000'),
    { kind: 'liability', holdingId: 'card', deductibleAmount: '20000' },
  ];

  it('does not deduct debts by default', () => {
    expect(ok(profile([cp('c', '2026-03-01', entries)]), 'c').base).toBe('100000');
  });

  it('deducts debts due within 12 months when the setting is on', () => {
    const r = ok(profile([cp('c', '2026-03-01', entries)], { deductDebts: true }), 'c');
    expect(r.deductions).toBe('20000');
    expect(r.base).toBe('80000');
  });

  it('deducts unpaid zakat from earlier years, ignoring payments made after this checkpoint', () => {
    const pay = (id: string, date: string, baseValue: string): Payment => ({
      id,
      date,
      recipientId: 'r',
      sent: { amount: baseValue, currency: 'SAR' },
      baseValue,
      appliesTo: { kind: 'checkpoint', checkpointId: 'y1' },
    });
    // y1: 40,000 SAR -> due 1,000. Paid 600 before y2's date, 300 after.
    let p = profile(
      [
        cp('y1', '2025-03-11', [cash('rajhi', '40000')]),
        cp('y2', '2026-03-01', [cash('rajhi', '100000')]),
      ],
      {},
      [pay('a', '2025-04-01', '600'), pay('b', '2026-04-01', '300')],
    );
    p = freeze(p, 'y1');
    const r = ok(p, 'y2');
    expect(r.unpaidPriorZakat).toBe('400');
    expect(r.base).toBe('99600');
  });
});

describe('year type (rules.md: Year type)', () => {
  it('uses 2.5775% for a solar year', () => {
    const r = ok(
      profile([cp('c', '2026-03-01', [cash('rajhi', '100000')])], { yearType: 'solar' }),
      'c',
    );
    expect(r.rate).toBe('0.025775');
    expect(due(r)).toBe('2577.5');
  });
});

describe('lowest-balance rule (rules.md: Year rule)', () => {
  const lowest = { yearRule: 'lowest-balance', deductUnpaidPriorZakat: false } as const;

  function history(
    prev: Entry[],
    now: Entry[],
    nowExtra: Parameters<typeof cp>[3] = {},
    prevPrices: Prices = PRICES,
  ) {
    let p = profile(
      [cp('y1', '2025-03-11', prev, { prices: prevPrices }), cp('y2', '2026-03-01', now, nowExtra)],
      lowest,
    );
    p = freeze(p, 'y1');
    return p;
  }

  it('treats a transfer between banks the same as no transfer', () => {
    const moved = ok(
      history(
        [cash('rajhi', '100000'), cash('snb', '0')],
        [cash('rajhi', '20000'), cash('snb', '80000')],
      ),
      'y2',
    );
    const stayed = ok(
      history(
        [cash('rajhi', '100000'), cash('snb', '0')],
        [cash('rajhi', '100000'), cash('snb', '0')],
      ),
      'y2',
    );
    expect(moved.base).toBe('100000');
    expect(moved.base).toBe(stayed.base);
  });

  it('counts only the lower of last year and today', () => {
    const r = ok(history([cash('rajhi', '100000')], [cash('rajhi', '150000')]), 'y2');
    expect(r.estimate).toBe('100000');
    expect(due(r)).toBe('2500');
  });

  it("values both sides at today's rate so a stronger dollar is not new money", () => {
    const r = ok(
      history([cash('hsbc', '10000')], [cash('hsbc', '10000')], {
        prices: { ...PRICES, fx: { USD: '4' } },
      }),
      'y2',
    );
    expect(r.estimate).toBe('40000');
  });

  it("uses last checkpoint's value for shares sold during the year", () => {
    const shares: Entry = {
      kind: 'shares',
      holdingId: 'tasi',
      count: '100',
      treatment: { kind: 'trading' },
      companyPaysZakat: false,
    };
    const r = ok(
      history(
        [cash('rajhi', '0'), shares],
        [cash('rajhi', '5000')],
        {},
        { ...PRICES, perHolding: { tasi: '50' } },
      ),
      'y2',
    );
    expect(r.estimate).toBe('5000');
  });

  it('uses a lower override from statements and ignores a higher one', () => {
    expect(
      ok(
        history([cash('rajhi', '100000')], [cash('rajhi', '100000')], {
          lowestBalanceOverride: '60000',
        }),
        'y2',
      ).base,
    ).toBe('60000');
    expect(
      ok(
        history([cash('rajhi', '100000')], [cash('rajhi', '100000')], {
          lowestBalanceOverride: '150000',
        }),
        'y2',
      ).base,
    ).toBe('100000');
  });

  it('restarts the year when the total dipped below nisab', () => {
    const r = ok(
      history([cash('rajhi', '100000')], [cash('rajhi', '100000')], { dippedBelowNisab: true }),
      'y2',
    );
    expect(r.outcome).toEqual({ kind: 'nothing-due', reason: 'dipped-below-nisab' });
  });
});

describe('missing inputs and warnings', () => {
  it('reports every missing price instead of valuing it at zero', () => {
    const p = profile([
      cp(
        'c',
        '2026-03-01',
        [
          cash('hsbc', '1000'),
          { kind: 'gold', holdingId: 'bars', grams: '10', karat: 24, personalJewellery: false },
        ],
        { prices: { fx: {}, metalPerGramPure: { silver: '5' }, perHolding: {} } },
      ),
    ]);
    const r = computeCheckpoint(p, 'c');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing).toContainEqual({ kind: 'fx', currency: 'USD' });
      expect(r.missing).toContainEqual({ kind: 'metal-price', metal: 'gold' });
    }
  });

  it('reports a missing price for shares that count', () => {
    const p = profile([
      cp('c', '2026-03-01', [
        {
          kind: 'shares',
          holdingId: 'tasi',
          count: '10',
          treatment: { kind: 'trading' },
          companyPaysZakat: false,
        },
      ]),
    ]);
    expect(computeCheckpoint(p, 'c')).toEqual({
      ok: false,
      missing: [{ kind: 'holding-price', holdingId: 'tasi' }],
    });
  });

  it('warns when the previous checkpoint is about two years back', () => {
    let p = profile([
      cp('y0', '2024-03-01', [cash('rajhi', '100000')]),
      cp('y2', '2026-03-01', [cash('rajhi', '100000')]),
    ]);
    p = freeze(p, 'y0');
    expect(ok(p, 'y2').warnings).toEqual(['gap-too-long']);
  });

  it('does not warn for a normal lunar year', () => {
    let p = profile([
      cp('y1', '2025-03-11', [cash('rajhi', '100000')]),
      cp('y2', '2026-03-01', [cash('rajhi', '100000')]),
    ]);
    p = freeze(p, 'y1');
    expect(ok(p, 'y2').warnings).toEqual([]);
  });

  it('throws for an unknown checkpoint id', () => {
    expect(() => computeCheckpoint(profile([]), 'nope')).toThrow(/nope/);
  });
});
