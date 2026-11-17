import { CURRENT_VERSION } from './schema';

export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** Step N upgrades a file from version N to N + 1. Version 1 is the first released format. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export function migrate(
  raw: Record<string, unknown> & { version: number },
  steps: Readonly<Record<number, Migration>> = MIGRATIONS,
): Record<string, unknown> {
  let current: Record<string, unknown> = raw;
  let version = raw.version;
  while (version < CURRENT_VERSION) {
    const step = steps[version];
    if (!step) throw new Error(`No migration from version ${version}`);
    current = step(current);
    version += 1;
  }
  return current;
}
