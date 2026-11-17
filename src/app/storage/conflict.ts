import type { Profile } from '../../engine/schema';

export type Meta = Profile['meta'];
export type OpenDecision = 'load-file' | 'same' | 'ask-file-older' | 'ask-unsaved-changes';

/**
 * What to do when the user opens a file while a working copy exists.
 * Never replace unsaved work or a newer copy without asking.
 */
export function decideOpen(
  working: { meta: Meta; dirty: boolean } | null,
  file: Meta,
): OpenDecision {
  if (!working) return 'load-file';
  if (working.dirty) return 'ask-unsaved-changes';
  if (working.meta.profileId !== file.profileId) return 'load-file';
  if (file.revision === working.meta.revision) return 'same';
  return file.revision > working.meta.revision ? 'load-file' : 'ask-file-older';
}
