import { describe, expect, it } from 'vitest';
import { sampleProfile } from '../../engine/testing/sample';
import { applyChange } from './applyChange';

describe('applyChange', () => {
  it('accepts a valid change', () => {
    const r = applyChange(sampleProfile(), (p) => ({
      ...p,
      settings: { ...p.settings, nisabBasis: 'gold' },
    }));
    expect(r.ok && r.profile.settings.nisabBasis).toBe('gold');
  });

  it('refuses a change that would make the profile unreadable, e.g. a long-term fraction of 25', () => {
    const r = applyChange(sampleProfile(), (p) => ({
      ...p,
      checkpoints: p.checkpoints.map((c) => ({
        ...c,
        entries: c.entries.map((e) =>
          e.kind === 'shares'
            ? { ...e, treatment: { kind: 'long-term' as const, zakatableFraction: '25' } }
            : e,
        ),
      })),
    }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join('\n')).toContain('zakatableFraction');
  });

  it('refuses two years on the same date', () => {
    const r = applyChange(sampleProfile(), (p) => {
      const c = p.checkpoints[0];
      if (!c) throw new Error('fixture');
      return { ...p, checkpoints: [...p.checkpoints, { ...c, id: 'dup' }] };
    });
    expect(r.ok).toBe(false);
  });

  it('turns a change that throws into a refusal instead of a crash', () => {
    const r = applyChange(sampleProfile(), () => {
      throw new Error('boom');
    });
    expect(r).toEqual({ ok: false, issues: ['boom'] });
  });
});
