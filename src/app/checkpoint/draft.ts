// Pure edits to a draft checkpoint. The UI calls these through useSession().update.
import type { Checkpoint, Entry, Holding, Profile } from '../../engine/schema';

const YEAR_DAYS = { lunar: 354, solar: 365 } as const;
const DAY_MS = 86_400_000;

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function latest(p: Profile): Checkpoint | undefined {
  return [...p.checkpoints].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

function mapCheckpoint(p: Profile, id: string, f: (c: Checkpoint) => Checkpoint): Profile {
  if (!p.checkpoints.some((c) => c.id === id)) throw new Error(`Unknown checkpoint "${id}"`);
  return { ...p, checkpoints: p.checkpoints.map((c) => (c.id === id ? f(c) : c)) };
}

/** A starting entry for a new holding: zero quantity, the classification that counts it in full. */
export function defaultEntry(h: Holding): Entry {
  const holdingId = h.id;
  switch (h.kind) {
    case 'cash':
      return { kind: 'cash', holdingId, amount: '0' };
    case 'gold':
      return { kind: 'gold', holdingId, grams: '0', karat: 24, personalJewellery: false };
    case 'silver':
      return { kind: 'silver', holdingId, grams: '0', fineness: 999, personalJewellery: false };
    case 'shares':
      return {
        kind: 'shares',
        holdingId,
        count: '0',
        treatment: { kind: 'trading' },
        companyPaysZakat: false,
      };
    case 'property':
      return { kind: 'property', holdingId, forSale: false };
    case 'receivable':
      return { kind: 'receivable', holdingId, amount: '0', collectable: true };
    case 'liability':
      return { kind: 'liability', holdingId, deductibleAmount: '0' };
    case 'other':
      return { kind: 'other', holdingId, amount: '0', category: 'other', zakatable: true };
  }
}

/**
 * Start a new zakat year: one zakat year after the latest checkpoint (or today for the first),
 * holdings and their classification copied forward, prices left for the user to enter.
 */
export function startCheckpoint(p: Profile, id: string, today: string): Profile {
  const last = latest(p);
  const date = last ? addDays(last.date, YEAR_DAYS[p.settings.yearType]) : today;
  const open = new Set(
    p.holdings.filter((h) => h.closedAt === undefined || h.closedAt > date).map((h) => h.id),
  );
  const c: Checkpoint = {
    id,
    date,
    baseCurrency: p.settings.baseCurrency,
    prices: { fx: {}, metalPerGramPure: {}, perHolding: {} },
    entries: last ? last.entries.filter((e) => open.has(e.holdingId)) : [],
    status: 'draft',
  };
  return { ...p, checkpoints: [...p.checkpoints, c] };
}

export function addHolding(p: Profile, checkpointId: string, h: Holding): Profile {
  const withHolding = { ...p, holdings: [...p.holdings, h] };
  return mapCheckpoint(withHolding, checkpointId, (c) => ({
    ...c,
    entries: [...c.entries, defaultEntry(h)],
  }));
}

export function closeHolding(p: Profile, checkpointId: string, holdingId: string): Profile {
  const c = p.checkpoints.find((x) => x.id === checkpointId);
  if (!c) throw new Error(`Unknown checkpoint "${checkpointId}"`);
  const withoutEntry = mapCheckpoint(p, checkpointId, (x) => ({
    ...x,
    entries: x.entries.filter((e) => e.holdingId !== holdingId),
  }));
  return {
    ...withoutEntry,
    holdings: withoutEntry.holdings.map((h) =>
      h.id === holdingId ? { ...h, closedAt: c.date } : h,
    ),
  };
}

export function updateEntry(p: Profile, checkpointId: string, entry: Entry): Profile {
  return mapCheckpoint(p, checkpointId, (c) => ({
    ...c,
    entries: c.entries.map((e) => (e.holdingId === entry.holdingId ? entry : e)),
  }));
}

export function updateCheckpoint(
  p: Profile,
  checkpointId: string,
  change: (c: Checkpoint) => Checkpoint,
): Profile {
  return mapCheckpoint(p, checkpointId, change);
}

export function renameHolding(p: Profile, holdingId: string, name: string): Profile {
  return { ...p, holdings: p.holdings.map((h) => (h.id === holdingId ? { ...h, name } : h)) };
}

function entriesOf(p: Profile, checkpointId: string): Entry[] {
  const c = p.checkpoints.find((x) => x.id === checkpointId);
  if (!c) throw new Error(`Unknown checkpoint "${checkpointId}"`);
  return c.entries;
}

/** Foreign currencies of holdings that have an entry in this checkpoint, sorted. */
export function currenciesInUse(p: Profile, checkpointId: string): string[] {
  const c = p.checkpoints.find((x) => x.id === checkpointId);
  if (!c) throw new Error(`Unknown checkpoint "${checkpointId}"`);
  const ids = new Set(c.entries.map((e) => e.holdingId));
  const set = new Set<string>();
  for (const h of p.holdings) {
    if (ids.has(h.id) && h.kind !== 'gold' && h.kind !== 'silver' && h.currency !== c.baseCurrency)
      set.add(h.currency);
  }
  return [...set].sort();
}

/** Metals whose price this checkpoint needs: the nisab basis plus any metal held. */
export function metalsNeeded(p: Profile, checkpointId: string): ('gold' | 'silver')[] {
  const kinds = new Set(entriesOf(p, checkpointId).map((e) => e.kind));
  return (['gold', 'silver'] as const).filter((m) => m === p.settings.nisabBasis || kinds.has(m));
}

/** Copy of a record with `key` set to `value`, or removed when `value` is undefined. */
export function withKey<V>(
  record: Readonly<Record<string, V>>,
  key: string,
  value: V | undefined,
): Record<string, V> {
  const rest = Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
  return value === undefined ? rest : { ...rest, [key]: value };
}
