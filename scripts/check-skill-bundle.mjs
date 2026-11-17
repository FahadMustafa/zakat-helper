// Fail when skills/zakat/scripts/zakat.mjs is out of date with the engine or CLI source.
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundle } from './build-skill.mjs';

const fresh = join(mkdtempSync(join(tmpdir(), 'zakat-skill-')), 'zakat.mjs');
await bundle(fresh);
const committed = 'skills/zakat/scripts/zakat.mjs';
let current = '';
try {
  current = readFileSync(committed, 'utf8');
} catch {
  // missing counts as stale
}
if (readFileSync(fresh, 'utf8') !== current) {
  console.error(`${committed} is stale. Run: npm run build:skill`);
  process.exit(1);
}
