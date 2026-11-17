import { parseProfile, type Profile } from '../../engine/schema';

export type ChangeResult = { ok: true; profile: Profile } | { ok: false; issues: string[] };

/**
 * Apply an edit only if the result is still a readable profile. The working copy is saved after
 * every change, so an invalid edit must never reach it: it would be refused on the next load.
 */
export function applyChange(p: Profile, change: (p: Profile) => Profile): ChangeResult {
  let next: Profile;
  try {
    next = change(p);
  } catch (err) {
    return { ok: false, issues: [err instanceof Error ? err.message : String(err)] };
  }
  const parsed = parseProfile(next);
  return parsed.ok ? { ok: true, profile: next } : { ok: false, issues: parsed.issues };
}
