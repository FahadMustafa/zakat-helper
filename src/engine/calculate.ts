import { Dec, roundToMinor } from './money';
import type {
  Checkpoint,
  CheckpointResult,
  Entry,
  Holding,
  HoldingLine,
  LineReason,
  Missing,
  OkResult,
  Profile,
  Settings,
  Warning,
} from './schema';

// Constants from skills/zakat/references/rules.md ("Constants").
const NISAB_GRAMS = { gold: Dec.parse('85'), silver: Dec.parse('595') } as const;
const RATE = { lunar: Dec.parse('0.025'), solar: Dec.parse('0.025775') } as const;
const YEAR_DAYS = { lunar: 354, solar: 365 } as const;
const GAP_TOLERANCE_DAYS = 15;
const ONE = Dec.fromInt(1);
const KARAT_PURE = Dec.fromInt(24);
const FINENESS_PURE = Dec.fromInt(1000);

type Prices = Checkpoint['prices'];
type Valued = { value: Dec; zakatable: Dec; reason: LineReason; isDebt: boolean };
type Valuation = { ok: true; v: Valued } | { ok: false; missing: Missing[] };

function sortedByDate(p: Profile): Checkpoint[] {
  return [...p.checkpoints].sort((a, b) => a.date.localeCompare(b.date));
}

function findCheckpoint(p: Profile, id: string): Checkpoint {
  const c = p.checkpoints.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown checkpoint "${id}"`);
  return c;
}

function findHolding(p: Profile, id: string): Holding {
  const h = p.holdings.find((x) => x.id === id);
  if (!h) throw new Error(`Unknown holding "${id}"`); // schema guarantees this; fail loud if bypassed
  return h;
}

/** The latest checkpoint dated before `c`, if any. */
export function previousCheckpoint(p: Profile, c: Checkpoint): Checkpoint | undefined {
  return sortedByDate(p)
    .filter((x) => x.date < c.date)
    .at(-1);
}

/** A checkpoint's result: frozen if finalised, computed live if a draft. */
export function resultOf(p: Profile, c: Checkpoint): CheckpointResult {
  return c.status === 'finalised' ? c.frozen.result : computeCheckpoint(p, c.id);
}

function fxRate(currency: string, base: string, prices: Prices): Dec | Missing {
  if (currency === base) return ONE;
  const r = prices.fx[currency];
  return r === undefined ? { kind: 'fx', currency } : Dec.parse(r);
}

function isMissing(x: Dec | Missing): x is Missing {
  return !(x instanceof Dec);
}

/** Value one entry in the base currency and apply the year's rules to it. */
function valueEntry(e: Entry, h: Holding, base: string, prices: Prices, s: Settings): Valuation {
  const missing: Missing[] = [];
  const need = <T extends Dec>(x: T | Missing): T | undefined => {
    if (isMissing(x)) {
      missing.push(x);
      return undefined;
    }
    return x;
  };
  const currencyOf = (): string => {
    if (h.kind === 'gold' || h.kind === 'silver') throw new Error('metals have no currency');
    return h.currency;
  };
  /** amount in the holding's currency -> base; when the line does not count, a missing rate values it at 0. */
  const toBase = (amount: Dec, counts: boolean): Dec | undefined => {
    const r = fxRate(currencyOf(), base, prices);
    if (isMissing(r)) return counts ? need(r) : Dec.ZERO;
    return amount.mul(r);
  };
  const done = (value: Dec, zakatable: Dec, reason: LineReason, isDebt = false): Valuation =>
    missing.length ? { ok: false, missing } : { ok: true, v: { value, zakatable, reason, isDebt } };
  const fail = (): Valuation => ({ ok: false, missing });

  switch (e.kind) {
    case 'cash': {
      const v = toBase(Dec.parse(e.amount), true);
      return v ? done(v, v, 'counted') : fail();
    }
    case 'gold':
    case 'silver': {
      const priceText = prices.metalPerGramPure[e.kind];
      if (priceText === undefined) {
        missing.push({ kind: 'metal-price', metal: e.kind });
        return fail();
      }
      // Multiply first, divide once: grams x karat x price / 24, grams x fineness x price / 1000.
      const value =
        e.kind === 'gold'
          ? Dec.parse(e.grams).mul(Dec.fromInt(e.karat)).mul(Dec.parse(priceText)).div(KARAT_PURE)
          : Dec.parse(e.grams)
              .mul(Dec.fromInt(e.fineness))
              .mul(Dec.parse(priceText))
              .div(FINENESS_PURE);
      const exempt = e.personalJewellery && !s.jewelleryZakatable;
      return exempt ? done(value, Dec.ZERO, 'jewellery-exempt') : done(value, value, 'counted');
    }
    case 'shares': {
      const counts = !e.companyPaysZakat;
      const priceText = prices.perHolding[e.holdingId];
      if (priceText === undefined) {
        if (counts) {
          missing.push({ kind: 'holding-price', holdingId: e.holdingId });
          return fail();
        }
        return done(Dec.ZERO, Dec.ZERO, 'company-pays');
      }
      const value = toBase(Dec.parse(e.count).mul(Dec.parse(priceText)), counts);
      if (!value) return fail();
      if (e.companyPaysZakat) return done(value, Dec.ZERO, 'company-pays');
      return e.treatment.kind === 'trading'
        ? done(value, value, 'counted')
        : done(value, value.mul(Dec.parse(e.treatment.zakatableFraction)), 'long-term-fraction');
    }
    case 'property': {
      const priceText = prices.perHolding[e.holdingId];
      if (!e.forSale) {
        const value = priceText === undefined ? Dec.ZERO : toBase(Dec.parse(priceText), false);
        return done(value ?? Dec.ZERO, Dec.ZERO, 'not-for-sale');
      }
      if (priceText === undefined) {
        missing.push({ kind: 'holding-price', holdingId: e.holdingId });
        return fail();
      }
      const value = toBase(Dec.parse(priceText), true);
      return value ? done(value, value, 'counted') : fail();
    }
    case 'receivable': {
      const value = toBase(Dec.parse(e.amount), e.collectable);
      if (!value) return fail();
      return e.collectable ? done(value, value, 'counted') : done(value, Dec.ZERO, 'doubtful-debt');
    }
    case 'liability': {
      const value = toBase(Dec.parse(e.deductibleAmount), s.deductDebts);
      if (!value) return fail();
      return s.deductDebts
        ? done(value, value, 'deducted-debt', true)
        : done(value, Dec.ZERO, 'debt-not-deducted', true);
    }
    case 'other': {
      const value = toBase(Dec.parse(e.amount), e.zakatable);
      if (!value) return fail();
      return e.zakatable
        ? done(value, value, 'counted')
        : done(value, Dec.ZERO, 'not-zakatable-by-user');
    }
  }
}

type Totals = { lines: HoldingLine[]; assets: Dec; debts: Dec; missing: Missing[] };

function valueEntries(
  p: Profile,
  entries: readonly Entry[],
  base: string,
  prices: Prices,
  s: Settings,
): Totals {
  const lines: HoldingLine[] = [];
  const missing: Missing[] = [];
  let assets = Dec.ZERO;
  let debts = Dec.ZERO;
  for (const e of entries) {
    const r = valueEntry(e, findHolding(p, e.holdingId), base, prices, s);
    if (!r.ok) {
      missing.push(...r.missing);
      continue;
    }
    const { value, zakatable, reason, isDebt } = r.v;
    lines.push({
      holdingId: e.holdingId,
      value: value.toString(),
      zakatableValue: zakatable.toString(),
      reason,
    });
    if (isDebt) debts = debts.add(zakatable);
    else assets = assets.add(zakatable);
  }
  return { lines, assets, debts, missing };
}

/** Zakat still owed on finalised checkpoints dated before `c`, counting payments made on or before `c.date`. */
function unpaidPriorZakat(p: Profile, c: Checkpoint): Dec {
  let total = Dec.ZERO;
  for (const prior of p.checkpoints) {
    if (prior.status !== 'finalised' || prior.date >= c.date) continue;
    const outcome = prior.frozen.result.outcome;
    if (outcome.kind !== 'due') continue;
    const paid = Dec.sum(
      p.payments
        .filter(
          (x) =>
            x.appliesTo.kind === 'checkpoint' &&
            x.appliesTo.checkpointId === prior.id &&
            x.date <= c.date,
        )
        .map((x) => Dec.parse(x.baseValue)),
    );
    const remaining = Dec.parse(outcome.due).sub(paid);
    if (!remaining.isNegative()) total = total.add(remaining);
  }
  return total;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function dedupe(missing: Missing[]): Missing[] {
  const seen = new Set<string>();
  return missing.filter((m) => {
    const k = JSON.stringify(m);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Previous checkpoint's holdings valued at THIS checkpoint's prices (lowest-balance estimate).
 * A holding that can't be valued now (closed, no price, no rate) keeps its value from the previous result.
 */
function previousValuedNow(
  p: Profile,
  prev: Checkpoint,
  prevResult: OkResult,
  c: Checkpoint,
  s: Settings,
): Dec {
  let assets = Dec.ZERO;
  let debts = Dec.ZERO;
  for (const e of prev.entries) {
    const r = valueEntry(e, findHolding(p, e.holdingId), c.baseCurrency, c.prices, s);
    let zakatable: Dec;
    let isDebt: boolean;
    if (r.ok) {
      zakatable = r.v.zakatable;
      isDebt = r.v.isDebt;
    } else {
      const old = prevResult.lines.find((l) => l.holdingId === e.holdingId);
      zakatable = old ? Dec.parse(old.zakatableValue) : Dec.ZERO;
      isDebt = e.kind === 'liability';
    }
    if (isDebt) debts = debts.add(zakatable);
    else assets = assets.add(zakatable);
  }
  return assets.sub(debts);
}

export function computeCheckpoint(p: Profile, checkpointId: string): CheckpointResult {
  const c = findCheckpoint(p, checkpointId);
  const s = p.settings;
  const missing: Missing[] = [];

  const {
    lines,
    assets,
    debts,
    missing: lineMissing,
  } = valueEntries(p, c.entries, c.baseCurrency, c.prices, s);
  missing.push(...lineMissing);

  const basisPrice = c.prices.metalPerGramPure[s.nisabBasis];
  if (basisPrice === undefined) missing.push({ kind: 'metal-price', metal: s.nisabBasis });

  // Was nisab held at the previous zakat date? From the previous checkpoint when there is a usable one,
  // otherwise from the user's first-year answer.
  const prev = previousCheckpoint(p, c);
  const prevResult = prev ? resultOf(p, prev) : undefined;
  const usablePrev = prev && prevResult?.ok ? { checkpoint: prev, result: prevResult } : undefined;
  let heldNisabAtPrevious: boolean | undefined;
  if (usablePrev) {
    heldNisabAtPrevious =
      Dec.parse(usablePrev.result.netTotal).cmp(Dec.parse(usablePrev.result.nisabThreshold)) >= 0;
  } else {
    heldNisabAtPrevious = c.heldNisabAtPrevious;
    if (heldNisabAtPrevious === undefined) missing.push({ kind: 'first-year-answer' });
  }

  if (missing.length || basisPrice === undefined || heldNisabAtPrevious === undefined) {
    return { ok: false, missing: dedupe(missing) };
  }

  const unpaid = s.deductUnpaidPriorZakat ? unpaidPriorZakat(p, c) : Dec.ZERO;
  const netTotal = assets.sub(debts).sub(unpaid);
  const nisab = NISAB_GRAMS[s.nisabBasis].mul(Dec.parse(basisPrice));
  const rate = RATE[s.yearType];

  let estimate: Dec | undefined;
  let base = netTotal;
  if (s.yearRule === 'lowest-balance') {
    estimate = usablePrev
      ? Dec.min(
          previousValuedNow(p, usablePrev.checkpoint, usablePrev.result, c, s).sub(unpaid),
          netTotal,
        )
      : netTotal;
    base = estimate;
    if (c.lowestBalanceOverride !== undefined)
      base = Dec.min(Dec.parse(c.lowestBalanceOverride), estimate);
  }

  const warnings: Warning[] = [];
  if (prev) {
    const gap = daysBetween(prev.date, c.date) - YEAR_DAYS[s.yearType];
    if (gap > GAP_TOLERANCE_DAYS) warnings.push('gap-too-long');
    if (gap < -GAP_TOLERANCE_DAYS) warnings.push('gap-too-short');
  }

  let outcome: OkResult['outcome'];
  if (!heldNisabAtPrevious) outcome = { kind: 'nothing-due', reason: 'no-nisab-at-previous' };
  else if (s.yearRule === 'lowest-balance' && c.dippedBelowNisab === true)
    outcome = { kind: 'nothing-due', reason: 'dipped-below-nisab' };
  else if (base.cmp(nisab) < 0) outcome = { kind: 'nothing-due', reason: 'below-nisab' };
  else outcome = { kind: 'due', due: roundToMinor(base.mul(rate), c.baseCurrency).toString() };

  return {
    ok: true,
    lines,
    zakatableTotal: assets.toString(),
    deductions: debts.toString(),
    unpaidPriorZakat: unpaid.toString(),
    netTotal: netTotal.toString(),
    ...(estimate === undefined ? {} : { estimate: estimate.toString() }),
    base: base.toString(),
    nisabThreshold: nisab.toString(),
    rate: rate.toString(),
    outcome,
    warnings,
  };
}
