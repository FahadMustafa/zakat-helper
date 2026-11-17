import { computeCheckpoint } from './calculate';
import { Dec } from './money';
import type { Checkpoint, Missing, NothingDueReason, Profile } from './schema';

export type FinaliseResult =
  | { kind: 'finalised'; profile: Profile }
  | { kind: 'missing'; missing: Missing[] }
  | { kind: 'already-finalised' };

export type YearStatus =
  | { state: 'draft' }
  | { state: 'nothing-due'; reason: NothingDueReason }
  | { state: 'due'; due: string; paid: string; remaining: string }
  | { state: 'settled'; due: string; paid: string }
  | { state: 'overpaid'; due: string; paid: string; over: string };

function find(p: Profile, id: string): Checkpoint {
  const c = p.checkpoints.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown checkpoint "${id}"`);
  return c;
}

function latest(p: Profile): Checkpoint | undefined {
  return [...p.checkpoints].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

export function paidTowards(p: Profile, checkpointId: string): Dec {
  return Dec.sum(
    p.payments
      .filter((x) => x.appliesTo.kind === 'checkpoint' && x.appliesTo.checkpointId === checkpointId)
      .map((x) => Dec.parse(x.baseValue)),
  );
}

/**
 * Freeze settings and result. Advance payments attach only when this is the latest-dated checkpoint,
 * so entering a past year after the fact never takes them.
 */
export function finaliseCheckpoint(p: Profile, checkpointId: string, now: string): FinaliseResult {
  const c = find(p, checkpointId);
  if (c.status === 'finalised') return { kind: 'already-finalised' };
  const result = computeCheckpoint(p, checkpointId);
  if (!result.ok) return { kind: 'missing', missing: result.missing };

  // Advance payments count towards the latest year, and only when it has zakat due.
  const takesAdvance = latest(p)?.id === checkpointId && result.outcome.kind === 'due';
  return {
    kind: 'finalised',
    profile: {
      ...p,
      checkpoints: p.checkpoints.map((x) =>
        x.id === checkpointId
          ? {
              ...x,
              status: 'finalised',
              finalisedAt: now,
              frozen: { settings: p.settings, result },
            }
          : x,
      ),
      payments: takesAdvance
        ? p.payments.map((x) =>
            x.appliesTo.kind === 'advance'
              ? { ...x, appliesTo: { kind: 'checkpoint', checkpointId } }
              : x,
          )
        : p.payments,
    },
  };
}

export function reopenCheckpoint(p: Profile, checkpointId: string): Profile {
  return {
    ...p,
    checkpoints: p.checkpoints.map((x): Checkpoint => {
      if (x.id !== checkpointId || x.status === 'draft') return x;
      const { finalisedAt, frozen, ...rest } = x;
      return { ...rest, status: 'draft' };
    }),
  };
}

export function yearStatus(p: Profile, checkpointId: string): YearStatus {
  const c = find(p, checkpointId);
  if (c.status === 'draft') return { state: 'draft' };
  const outcome = c.frozen.result.outcome;
  if (outcome.kind === 'nothing-due') return { state: 'nothing-due', reason: outcome.reason };
  const due = Dec.parse(outcome.due);
  const paid = paidTowards(p, checkpointId);
  const diff = due.sub(paid);
  const base = { due: due.toString(), paid: paid.toString() };
  if (diff.isZero()) return { state: 'settled', ...base };
  if (diff.isNegative()) return { state: 'overpaid', ...base, over: paid.sub(due).toString() };
  return { state: 'due', ...base, remaining: diff.toString() };
}

export function outstandingYears(p: Profile): { checkpointId: string; remaining: string }[] {
  return [...p.checkpoints]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((c) => {
      const s = yearStatus(p, c.id);
      return s.state === 'due' ? [{ checkpointId: c.id, remaining: s.remaining }] : [];
    });
}

/** Advance payment needs nisab in hand: the latest finished year was at or above nisab. */
export function canPayInAdvance(p: Profile): boolean {
  const done = [...p.checkpoints]
    .filter((c) => c.status === 'finalised')
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  if (done?.status !== 'finalised') return false;
  const r = done.frozen.result;
  return Dec.parse(r.netTotal).cmp(Dec.parse(r.nisabThreshold)) >= 0;
}
