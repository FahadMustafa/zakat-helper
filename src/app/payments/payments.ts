import { Dec } from '../../engine/money';
import type { Checkpoint, Payment, Profile } from '../../engine/schema';

export type RecipientChoice =
  { kind: 'existing'; id: string } | { kind: 'new'; id: string; name: string };

export type PaymentDraft = Omit<Payment, 'recipientId' | 'note'> & {
  recipient: RecipientChoice;
  note?: string;
};

/** What a payment is worth in the checkpoint's base currency, at that checkpoint's rate. */
export function baseValueFor(amount: string, currency: string, c: Checkpoint): string | undefined {
  if (currency === c.baseCurrency) return amount;
  const rate = c.prices.fx[currency];
  return rate === undefined ? undefined : Dec.parse(amount).mul(Dec.parse(rate)).toString();
}

const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export function addPayment(p: Profile, d: PaymentDraft): Profile {
  let recipients = p.recipients;
  let recipientId: string;
  if (d.recipient.kind === 'existing') {
    recipientId = d.recipient.id;
  } else {
    const name = d.recipient.name.trim();
    const existing = recipients.find((r) => sameName(r.name, name));
    if (existing) recipientId = existing.id;
    else {
      recipientId = d.recipient.id;
      recipients = [...recipients, { id: recipientId, name }];
    }
  }
  const note = d.note?.trim();
  const payment: Payment = {
    id: d.id,
    date: d.date,
    recipientId,
    sent: d.sent,
    baseValue: d.baseValue,
    appliesTo: d.appliesTo,
    ...(note ? { note } : {}),
  };
  return { ...p, recipients, payments: [...p.payments, payment] };
}

export function removePayment(p: Profile, id: string): Profile {
  return { ...p, payments: p.payments.filter((x) => x.id !== id) };
}
