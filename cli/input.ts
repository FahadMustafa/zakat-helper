import { z } from 'zod';
import {
  Amount,
  Currency,
  DEFAULT_SETTINGS,
  IsoDate,
  Settings,
  parseProfile,
  type Entry,
  type Holding,
  type Profile,
} from '../src/engine/schema';

const name = z.string().trim().min(1);

/** The minimal input an agent can build from a conversation. Documented in skills/zakat/SKILL.md. */
const Item = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('cash'), name, currency: Currency, amount: Amount }),
  z.strictObject({
    kind: z.literal('gold'),
    name,
    grams: Amount,
    karat: z.int().min(1).max(24),
    personalJewellery: z.boolean().default(false),
  }),
  z.strictObject({
    kind: z.literal('silver'),
    name,
    grams: Amount,
    fineness: z.int().min(1).max(1000),
    personalJewellery: z.boolean().default(false),
  }),
  z.strictObject({
    kind: z.literal('shares'),
    name,
    currency: Currency,
    count: Amount,
    pricePerShare: Amount.optional(),
    treatment: z.enum(['trading', 'long-term']),
    zakatableFraction: Amount.default('0.25'),
    companyPaysZakat: z.boolean().default(false),
  }),
  z.strictObject({
    kind: z.literal('property'),
    name,
    currency: Currency,
    forSale: z.boolean(),
    value: Amount.optional(),
  }),
  z.strictObject({
    kind: z.literal('receivable'),
    name,
    currency: Currency,
    amount: Amount,
    collectable: z.boolean(),
  }),
  z.strictObject({
    kind: z.literal('liability'),
    name,
    currency: Currency,
    deductibleAmount: Amount,
  }),
  z.strictObject({
    kind: z.literal('other'),
    name,
    currency: Currency,
    amount: Amount,
    category: z.enum(['pension', 'crypto', 'goods-for-sale', 'other']).default('other'),
    zakatable: z.boolean(),
  }),
]);

export const MinimalInput = z.strictObject({
  settings: Settings.partial().optional(),
  date: IsoDate,
  baseCurrency: Currency,
  heldNisabAtPreviousZakatDate: z.boolean(),
  lowestBalance: Amount.optional(),
  prices: z.strictObject({
    fx: z.record(Currency, Amount).default({}),
    goldPerGramPure: Amount.optional(),
    silverPerGramPure: Amount.optional(),
  }),
  holdings: z.array(Item),
});

type Issues = { ok: false; issues: string[] };

export function profileFromInput(raw: unknown): { ok: true; profile: Profile } | Issues {
  const r = MinimalInput.safeParse(raw);
  if (!r.success) {
    return {
      ok: false,
      issues: r.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    };
  }
  const input = r.data;
  const holdings: Holding[] = [];
  const entries: Entry[] = [];
  const perHolding: Record<string, string> = {};

  input.holdings.forEach((item, i) => {
    const id = `h${i + 1}`;
    switch (item.kind) {
      case 'cash':
        holdings.push({ id, kind: 'cash', name: item.name, currency: item.currency });
        entries.push({ kind: 'cash', holdingId: id, amount: item.amount });
        break;
      case 'gold':
        holdings.push({ id, kind: 'gold', name: item.name });
        entries.push({
          kind: 'gold',
          holdingId: id,
          grams: item.grams,
          karat: item.karat,
          personalJewellery: item.personalJewellery,
        });
        break;
      case 'silver':
        holdings.push({ id, kind: 'silver', name: item.name });
        entries.push({
          kind: 'silver',
          holdingId: id,
          grams: item.grams,
          fineness: item.fineness,
          personalJewellery: item.personalJewellery,
        });
        break;
      case 'shares':
        holdings.push({ id, kind: 'shares', name: item.name, currency: item.currency });
        entries.push({
          kind: 'shares',
          holdingId: id,
          count: item.count,
          treatment:
            item.treatment === 'trading'
              ? { kind: 'trading' }
              : { kind: 'long-term', zakatableFraction: item.zakatableFraction },
          companyPaysZakat: item.companyPaysZakat,
        });
        if (item.pricePerShare !== undefined) perHolding[id] = item.pricePerShare;
        break;
      case 'property':
        holdings.push({ id, kind: 'property', name: item.name, currency: item.currency });
        entries.push({ kind: 'property', holdingId: id, forSale: item.forSale });
        if (item.value !== undefined) perHolding[id] = item.value;
        break;
      case 'receivable':
        holdings.push({ id, kind: 'receivable', name: item.name, currency: item.currency });
        entries.push({
          kind: 'receivable',
          holdingId: id,
          amount: item.amount,
          collectable: item.collectable,
        });
        break;
      case 'liability':
        holdings.push({ id, kind: 'liability', name: item.name, currency: item.currency });
        entries.push({ kind: 'liability', holdingId: id, deductibleAmount: item.deductibleAmount });
        break;
      case 'other':
        holdings.push({ id, kind: 'other', name: item.name, currency: item.currency });
        entries.push({
          kind: 'other',
          holdingId: id,
          amount: item.amount,
          category: item.category,
          zakatable: item.zakatable,
        });
        break;
    }
  });

  const metal: { gold?: string; silver?: string } = {};
  if (input.prices.goldPerGramPure !== undefined) metal.gold = input.prices.goldPerGramPure;
  if (input.prices.silverPerGramPure !== undefined) metal.silver = input.prices.silverPerGramPure;

  return parseProfile({
    format: 'zakat-helper',
    version: 1,
    meta: { profileId: '00000000-0000-4000-8000-000000000000', revision: 0, savedAt: null },
    settings: { ...DEFAULT_SETTINGS, baseCurrency: input.baseCurrency, ...input.settings },
    holdings,
    checkpoints: [
      {
        id: 'input',
        date: input.date,
        baseCurrency: input.baseCurrency,
        prices: { fx: input.prices.fx, metalPerGramPure: metal, perHolding },
        entries,
        heldNisabAtPrevious: input.heldNisabAtPreviousZakatDate,
        ...(input.lowestBalance === undefined
          ? {}
          : { lowestBalanceOverride: input.lowestBalance }),
        status: 'draft',
      },
    ],
    payments: [],
    recipients: [],
  });
}
