// Zakat Helper CLI. Bundled into skills/zakat/scripts/zakat.mjs by scripts/build-skill.mjs.
import { readFileSync } from 'node:fs';
import { computeCheckpoint } from '../src/engine/calculate';
import { openFile } from '../src/engine/file';
import { yearStatus } from '../src/engine/ledger';
import type { Profile } from '../src/engine/schema';
import { profileFromInput } from './input';

const USAGE = `Usage:
  node zakat.mjs <profile.json> [--checkpoint <id>]   a file saved by the Zakat Helper app
  node zakat.mjs --input <input.json>                 the minimal input described in SKILL.md
Encrypted files read the passphrase from the ZAKAT_PASSPHRASE environment variable.`;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function loadProfile(args: string[]): Promise<{ profile: Profile; checkpointId?: string }> {
  if (args[0] === '--input') {
    const path = args[1] ?? fail(USAGE);
    const r = profileFromInput(JSON.parse(readFileSync(path, 'utf8')) as unknown);
    if (!r.ok) fail(`Input is not valid:\n${r.issues.join('\n')}`);
    return { profile: r.profile };
  }
  const path = args[0] ?? fail(USAGE);
  const i = args.indexOf('--checkpoint');
  const checkpointId = i >= 0 ? (args[i + 1] ?? fail(USAGE)) : undefined;
  const passphrase = process.env['ZAKAT_PASSPHRASE'] || undefined;
  const r = await openFile(readFileSync(path, 'utf8'), passphrase);
  switch (r.kind) {
    case 'ok':
      return checkpointId === undefined
        ? { profile: r.profile }
        : { profile: r.profile, checkpointId };
    case 'needs-passphrase':
      return fail('This file is encrypted. Set ZAKAT_PASSPHRASE to its passphrase and run again.');
    case 'wrong-passphrase':
      return fail('The passphrase in ZAKAT_PASSPHRASE does not open this file.');
    case 'newer-version':
      return fail(
        `This file was saved by a newer version of Zakat Helper (format ${r.version}). Update the skill.`,
      );
    case 'invalid':
      return fail(`This file cannot be read:\n${r.issues.join('\n')}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const { profile, checkpointId } = await loadProfile(args);
  const latest = [...profile.checkpoints].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const c =
    checkpointId === undefined ? latest : profile.checkpoints.find((x) => x.id === checkpointId);
  if (!c)
    fail(
      checkpointId
        ? `No checkpoint "${checkpointId}" in this file.`
        : 'This file has no checkpoints yet.',
    );
  const result = c.status === 'finalised' ? c.frozen.result : computeCheckpoint(profile, c.id);
  const settings = c.status === 'finalised' ? c.frozen.settings : profile.settings;
  const out = {
    checkpoint: { id: c.id, date: c.date, baseCurrency: c.baseCurrency, status: c.status },
    settings,
    result,
    year: yearStatus(profile, c.id),
    note: 'Zakat Helper is a calculator, not a fatwa.',
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
