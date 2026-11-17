import { useState } from 'react';
import type { Checkpoint, Payment } from '../../engine/schema';
import { AmountInput } from '../components/AmountInput';
import { useT } from '../i18n/locale';
import { useOpenProfile } from '../storage/sessionContext';
import { addPayment, baseValueFor } from './payments';

const NEW = '__new__';

/** Add a payment against a finished year, or in advance when `checkpoint` is undefined. */
export function PaymentForm({
  checkpoint,
  baseCurrency,
  onDone,
}: {
  checkpoint: Checkpoint | undefined;
  baseCurrency: string;
  onDone: (added: boolean) => void;
}) {
  const t = useT();
  const { profile, update } = useOpenProfile();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [recipient, setRecipient] = useState(profile.recipients[0]?.id ?? NEW);
  const [newName, setNewName] = useState('');
  const [amount, setAmount] = useState<string | undefined>();
  const [currency, setCurrency] = useState(baseCurrency);
  const [baseValue, setBaseValue] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const sameCurrency = currency === baseCurrency;
  const suggested =
    amount && checkpoint
      ? baseValueFor(amount, currency, checkpoint)
      : sameCurrency
        ? amount
        : undefined;
  const value = sameCurrency ? amount : (baseValue ?? suggested);
  const canAdd =
    amount !== undefined && value !== undefined && (recipient !== NEW || newName.trim() !== '');
  const appliesTo: Payment['appliesTo'] = checkpoint
    ? { kind: 'checkpoint', checkpointId: checkpoint.id }
    : { kind: 'advance' };

  return (
    <form
      className="stack note"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canAdd) return;
        update((p) =>
          addPayment(p, {
            id: crypto.randomUUID(),
            date,
            sent: { amount, currency },
            baseValue: value,
            appliesTo,
            note,
            recipient:
              recipient === NEW
                ? { kind: 'new', id: crypto.randomUUID(), name: newName }
                : { kind: 'existing', id: recipient },
          }),
        );
        onDone(true);
      }}
    >
      <h3>{checkpoint ? t.payment.title : t.payment.titleAdvance}</h3>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="pay-date">{t.payment.date}</label>
          <input
            id="pay-date"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="pay-to">{t.payment.recipient}</label>
          <select
            id="pay-to"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
            }}
          >
            {profile.recipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            <option value={NEW}>{t.payment.newRecipient}</option>
          </select>
        </div>
      </div>
      {recipient === NEW && (
        <div className="field">
          <label htmlFor="pay-name">{t.payment.recipientName}</label>
          <input
            id="pay-name"
            type="text"
            value={newName}
            placeholder={t.payment.recipientHint}
            onChange={(e) => {
              setNewName(e.target.value);
            }}
          />
        </div>
      )}
      <div className="grid-2">
        <AmountInput id="pay-amount" label={t.payment.amount} value={amount} onCommit={setAmount} />
        <div className="field">
          <label htmlFor="pay-ccy">{t.payment.currency}</label>
          <select
            id="pay-ccy"
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              setBaseValue(undefined);
            }}
          >
            {Intl.supportedValuesOf('currency').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!sameCurrency && (
        <AmountInput
          key={`${currency}-${suggested ?? ''}`}
          id="pay-base"
          label={t.payment.baseValue(baseCurrency)}
          hint={t.payment.baseValueHint}
          value={value}
          onCommit={setBaseValue}
        />
      )}
      <div className="field">
        <label htmlFor="pay-note">{t.payment.note}</label>
        <input
          id="pay-note"
          type="text"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
          }}
        />
      </div>
      <div className="actions">
        <button className="btn" type="submit" disabled={!canAdd}>
          {t.payment.add}
        </button>
        <button
          className="btn quiet"
          type="button"
          onClick={() => {
            onDone(false);
          }}
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}
