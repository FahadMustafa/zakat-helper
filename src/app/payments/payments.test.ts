import { describe, expect, it } from 'vitest';
import { sampleProfile } from '../../engine/testing/sample';
import { addPayment, baseValueFor, removePayment } from './payments';

describe('baseValueFor', () => {
  const c = sampleProfile().checkpoints[0];
  if (!c) throw new Error('fixture');

  it('is the amount itself in the base currency', () => {
    expect(baseValueFor('1500', 'SAR', c)).toBe('1500');
  });

  it("converts at the checkpoint's rate, exactly", () => {
    expect(baseValueFor('400', 'USD', c)).toBe('1500');
  });

  it('is unknown without a rate', () => {
    expect(baseValueFor('400', 'EUR', c)).toBeUndefined();
  });
});

describe('addPayment', () => {
  const draft = {
    id: 'p1',
    date: '2026-03-03',
    sent: { amount: '3000', currency: 'SAR' },
    baseValue: '3000',
    appliesTo: { kind: 'checkpoint' as const, checkpointId: 'cp-1447' },
  };

  it('uses an existing recipient', () => {
    const p = addPayment(sampleProfile(), {
      ...draft,
      recipient: { kind: 'existing', id: 'ehsan' },
    });
    expect(p.recipients).toHaveLength(1);
    expect(p.payments).toEqual([{ ...draft, recipientId: 'ehsan' }]);
  });

  it('creates a new recipient once and reuses it by name', () => {
    let p = addPayment(sampleProfile(), {
      ...draft,
      recipient: { kind: 'new', id: 'r-new', name: 'Mosque fund' },
    });
    p = addPayment(p, {
      ...draft,
      id: 'p2',
      recipient: { kind: 'new', id: 'r-other', name: ' mosque fund ' },
    });
    expect(p.recipients.map((r) => r.name)).toEqual(['Ehsan platform', 'Mosque fund']);
    expect(p.payments.map((x) => x.recipientId)).toEqual(['r-new', 'r-new']);
  });

  it('keeps the note only when there is one', () => {
    const p = addPayment(sampleProfile(), {
      ...draft,
      note: '  ',
      recipient: { kind: 'existing', id: 'ehsan' },
    });
    expect(p.payments[0]).not.toHaveProperty('note');
  });
});

describe('removePayment', () => {
  it('removes only that payment', () => {
    const base = sampleProfile();
    const withTwo = addPayment(
      addPayment(base, {
        id: 'a',
        date: '2026-03-03',
        sent: { amount: '1', currency: 'SAR' },
        baseValue: '1',
        appliesTo: { kind: 'advance' },
        recipient: { kind: 'existing', id: 'ehsan' },
      }),
      {
        id: 'b',
        date: '2026-03-04',
        sent: { amount: '2', currency: 'SAR' },
        baseValue: '2',
        appliesTo: { kind: 'advance' },
        recipient: { kind: 'existing', id: 'ehsan' },
      },
    );
    expect(removePayment(withTwo, 'a').payments.map((p) => p.id)).toEqual(['b']);
  });
});
