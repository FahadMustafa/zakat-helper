import { z } from 'zod';
import { Dec } from './money';

// ---------- primitives ----------

/** Non-negative decimal written as a string: "95000", "3.75". No grouping, no exponent. */
export const Amount = z.string().regex(/^\d+(\.\d+)?$/, 'expected a non-negative decimal string');
/** Signed decimal string, for computed results that may be negative (e.g. net totals). */
export const SignedAmount = z.string().regex(/^-?\d+(\.\d+)?$/, 'expected a decimal string');
export const Currency = z.string().regex(/^[A-Z]{3}$/, 'expected an ISO 4217 code like SAR');
export const IsoDate = z.iso.date();
const Id = z.string().min(1);
const Name = z.string().trim().min(1);
const Fraction = Amount.refine(
  (s) => Dec.parse(s).cmp(Dec.fromInt(1)) <= 0,
  'must be between 0 and 1',
);

// ---------- settings ----------

export const Settings = z.strictObject({
  locale: z.enum(['en', 'ar']),
  dateDisplay: z.enum(['hijri', 'gregorian', 'both']),
  baseCurrency: Currency,
  yearRule: z.enum(['whole-balance', 'lowest-balance']),
  yearType: z.enum(['lunar', 'solar']),
  nisabBasis: z.enum(['silver', 'gold']),
  jewelleryZakatable: z.boolean(),
  deductDebts: z.boolean(),
  deductUnpaidPriorZakat: z.boolean(),
});
export type Settings = z.infer<typeof Settings>;

export const DEFAULT_SETTINGS: Settings = {
  locale: 'en',
  dateDisplay: 'both',
  baseCurrency: 'SAR',
  yearRule: 'whole-balance',
  yearType: 'lunar',
  nisabBasis: 'silver',
  jewelleryZakatable: true,
  deductDebts: false,
  deductUnpaidPriorZakat: true,
};

// ---------- holdings (identity only; per-year facts live on entries) ----------

const holdingBase = { id: Id, name: Name, closedAt: IsoDate.optional() };

export const Holding = z.discriminatedUnion('kind', [
  z.strictObject({ ...holdingBase, kind: z.literal('cash'), currency: Currency }),
  z.strictObject({ ...holdingBase, kind: z.literal('gold') }),
  z.strictObject({ ...holdingBase, kind: z.literal('silver') }),
  z.strictObject({ ...holdingBase, kind: z.literal('shares'), currency: Currency }),
  z.strictObject({ ...holdingBase, kind: z.literal('property'), currency: Currency }),
  z.strictObject({ ...holdingBase, kind: z.literal('receivable'), currency: Currency }),
  z.strictObject({ ...holdingBase, kind: z.literal('liability'), currency: Currency }),
  z.strictObject({ ...holdingBase, kind: z.literal('other'), currency: Currency }),
]);
export type Holding = z.infer<typeof Holding>;
export type HoldingKind = Holding['kind'];

// ---------- checkpoint entries (quantity + classification for that year) ----------

const entryBase = { holdingId: Id };

export const Entry = z.discriminatedUnion('kind', [
  z.strictObject({ ...entryBase, kind: z.literal('cash'), amount: Amount }),
  z.strictObject({
    ...entryBase,
    kind: z.literal('gold'),
    grams: Amount,
    karat: z.int().min(1).max(24),
    personalJewellery: z.boolean(),
  }),
  z.strictObject({
    ...entryBase,
    kind: z.literal('silver'),
    grams: Amount,
    fineness: z.int().min(1).max(1000),
    personalJewellery: z.boolean(),
  }),
  z.strictObject({
    ...entryBase,
    kind: z.literal('shares'),
    count: Amount,
    treatment: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('trading') }),
      z.strictObject({ kind: z.literal('long-term'), zakatableFraction: Fraction }),
    ]),
    companyPaysZakat: z.boolean(),
  }),
  z.strictObject({ ...entryBase, kind: z.literal('property'), forSale: z.boolean() }),
  z.strictObject({
    ...entryBase,
    kind: z.literal('receivable'),
    amount: Amount,
    collectable: z.boolean(),
  }),
  z.strictObject({ ...entryBase, kind: z.literal('liability'), deductibleAmount: Amount }),
  z.strictObject({
    ...entryBase,
    kind: z.literal('other'),
    amount: Amount,
    category: z.enum(['pension', 'crypto', 'goods-for-sale', 'other']),
    zakatable: z.boolean(),
  }),
]);
export type Entry = z.infer<typeof Entry>;

// ---------- results (computed by calculate.ts, frozen into finalised checkpoints) ----------

export const LineReason = z.enum([
  'counted',
  'converted',
  'long-term-fraction',
  'jewellery-exempt',
  'company-pays',
  'not-for-sale',
  'doubtful-debt',
  'not-zakatable-by-user',
  'deducted-debt',
  'debt-not-deducted',
]);
export type LineReason = z.infer<typeof LineReason>;

export const Warning = z.enum(['gap-too-long', 'gap-too-short']);
export type Warning = z.infer<typeof Warning>;

export const NothingDueReason = z.enum([
  'below-nisab',
  'no-nisab-at-previous',
  'dipped-below-nisab',
]);
export type NothingDueReason = z.infer<typeof NothingDueReason>;

export const Missing = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('holding-price'), holdingId: Id }),
  z.strictObject({ kind: z.literal('fx'), currency: Currency }),
  z.strictObject({ kind: z.literal('metal-price'), metal: z.enum(['gold', 'silver']) }),
  z.strictObject({ kind: z.literal('first-year-answer') }),
]);
export type Missing = z.infer<typeof Missing>;

export const HoldingLine = z.strictObject({
  holdingId: Id,
  /** Value in the base currency before any rule is applied. */
  value: Amount,
  /** What the rules count, in the base currency. Deductions are positive here and subtracted. */
  zakatableValue: Amount,
  reason: LineReason,
});
export type HoldingLine = z.infer<typeof HoldingLine>;

export const OkResult = z.strictObject({
  ok: z.literal(true),
  lines: z.array(HoldingLine),
  zakatableTotal: Amount,
  deductions: Amount,
  unpaidPriorZakat: Amount,
  netTotal: SignedAmount,
  /** Lowest-balance rule only: the app's estimate before any override. */
  estimate: SignedAmount.optional(),
  base: SignedAmount,
  nisabThreshold: Amount,
  rate: Amount,
  outcome: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('due'), due: Amount }),
    z.strictObject({ kind: z.literal('nothing-due'), reason: NothingDueReason }),
  ]),
  warnings: z.array(Warning),
});
export type OkResult = z.infer<typeof OkResult>;

export const CheckpointResult = z.discriminatedUnion('ok', [
  OkResult,
  z.strictObject({ ok: z.literal(false), missing: z.array(Missing).min(1) }),
]);
export type CheckpointResult = z.infer<typeof CheckpointResult>;

// ---------- checkpoints ----------

const checkpointBase = {
  id: Id,
  date: IsoDate,
  baseCurrency: Currency,
  prices: z.strictObject({
    /** 1 unit of the foreign currency = x units of the base currency. */
    fx: z.record(Currency, Amount),
    /** Price per gram of PURE metal, in the base currency. */
    metalPerGramPure: z.strictObject({ gold: Amount.optional(), silver: Amount.optional() }),
    /** Share price or property value, in the holding's currency. */
    perHolding: z.record(Id, Amount),
  }),
  entries: z.array(Entry),
  /** First checkpoint only: did the user hold at least nisab at their last zakat date? */
  heldNisabAtPrevious: z.boolean().optional(),
  /** Lowest-balance rule: a lower figure from the user's statements, in the base currency. */
  lowestBalanceOverride: Amount.optional(),
  /** Lowest-balance rule: the total fell below nisab during the year, so the year restarts. */
  dippedBelowNisab: z.boolean().optional(),
};

export const Checkpoint = z.discriminatedUnion('status', [
  z.strictObject({ ...checkpointBase, status: z.literal('draft') }),
  z.strictObject({
    ...checkpointBase,
    status: z.literal('finalised'),
    finalisedAt: z.iso.datetime(),
    frozen: z.strictObject({ settings: Settings, result: OkResult }),
  }),
]);
export type Checkpoint = z.infer<typeof Checkpoint>;

// ---------- payments ----------

export const Recipient = z.strictObject({ id: Id, name: Name });
export type Recipient = z.infer<typeof Recipient>;

export const Payment = z.strictObject({
  id: Id,
  date: IsoDate,
  recipientId: Id,
  sent: z.strictObject({ amount: Amount, currency: Currency }),
  /** Value in the checkpoint's base currency on the payment date; this counts against the due. */
  baseValue: Amount,
  note: z.string().optional(),
  appliesTo: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('checkpoint'), checkpointId: Id }),
    z.strictObject({ kind: z.literal('advance') }),
  ]),
});
export type Payment = z.infer<typeof Payment>;

// ---------- profile ----------

export const CURRENT_VERSION = 1;

export const Profile = z
  .strictObject({
    format: z.literal('zakat-helper'),
    version: z.literal(CURRENT_VERSION),
    meta: z.strictObject({
      profileId: z.uuid(),
      revision: z.int().min(0),
      savedAt: z.iso.datetime().nullable(),
    }),
    settings: Settings,
    holdings: z.array(Holding),
    checkpoints: z.array(Checkpoint),
    payments: z.array(Payment),
    recipients: z.array(Recipient),
  })
  .superRefine((p, ctx) => {
    const holdings = new Map<string, Holding>();
    p.holdings.forEach((h, i) => {
      if (holdings.has(h.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['holdings', i, 'id'],
          message: `duplicate holding id "${h.id}"`,
        });
      }
      holdings.set(h.id, h);
    });

    const checkpointIds = new Set<string>();
    const dates = new Set<string>();
    p.checkpoints.forEach((c, ci) => {
      if (checkpointIds.has(c.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['checkpoints', ci, 'id'],
          message: `duplicate checkpoint id "${c.id}"`,
        });
      }
      checkpointIds.add(c.id);
      if (dates.has(c.date)) {
        ctx.addIssue({
          code: 'custom',
          path: ['checkpoints', ci, 'date'],
          message: `two checkpoints on ${c.date}`,
        });
      }
      dates.add(c.date);

      const seen = new Set<string>();
      c.entries.forEach((e, ei) => {
        const path = ['checkpoints', ci, 'entries', ei];
        const h = holdings.get(e.holdingId);
        if (!h) {
          ctx.addIssue({ code: 'custom', path, message: `unknown holding "${e.holdingId}"` });
        } else if (h.kind !== e.kind) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: `entry kind "${e.kind}" does not match holding kind "${h.kind}"`,
          });
        }
        if (seen.has(e.holdingId)) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: `holding "${e.holdingId}" appears more than once`,
          });
        }
        seen.add(e.holdingId);
      });
    });

    const recipients = new Set(p.recipients.map((r) => r.id));
    p.payments.forEach((pay, i) => {
      if (!recipients.has(pay.recipientId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['payments', i, 'recipientId'],
          message: `unknown recipient "${pay.recipientId}"`,
        });
      }
      if (pay.appliesTo.kind === 'checkpoint' && !checkpointIds.has(pay.appliesTo.checkpointId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['payments', i, 'appliesTo', 'checkpointId'],
          message: `unknown checkpoint "${pay.appliesTo.checkpointId}"`,
        });
      }
    });
  });
export type Profile = z.infer<typeof Profile>;

export function parseProfile(
  raw: unknown,
): { ok: true; profile: Profile } | { ok: false; issues: string[] } {
  const r = Profile.safeParse(raw);
  if (r.success) return { ok: true, profile: r.data };
  return {
    ok: false,
    issues: r.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}
