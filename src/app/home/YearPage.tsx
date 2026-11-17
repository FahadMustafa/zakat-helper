import { useState } from 'react';
import { reopenCheckpoint, yearStatus } from '../../engine/ledger';
import { discardDraft } from '../checkpoint/draft';
import { Breakdown, SettingsUsed } from '../checkpoint/Review';
import { Confirm } from '../components/Confirm';
import { formatDate, yearLabel } from '../dates';
import { useLocale, useT } from '../i18n/locale';
import { formatAmount } from '../numbers';
import { PaymentForm } from '../payments/PaymentForm';
import { removePayment } from '../payments/payments';
import { useOpenProfile } from '../storage/sessionContext';
import { YearFigures } from './YearSummary';

export function YearPage({
  checkpointId,
  onEdit,
  onDiscarded,
}: {
  checkpointId: string;
  onEdit: () => void;
  onDiscarded: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { profile, update, dirty } = useOpenProfile();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const checkpoint = profile.checkpoints.find((c) => c.id === checkpointId);
  if (!checkpoint) throw new Error(`Unknown checkpoint ${checkpointId}`);
  const status = yearStatus(profile, checkpointId);
  const display = profile.settings.dateDisplay;
  const base = checkpoint.baseCurrency;
  const money = (v: string, ccy = base) => formatAmount(v, ccy, locale);
  const payments = profile.payments
    .filter((p) => p.appliesTo.kind === 'checkpoint' && p.appliesTo.checkpointId === checkpointId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nameOf = (id: string) => profile.recipients.find((r) => r.id === id)?.name ?? id;
  const toDelete = payments.find((p) => p.id === confirmDelete);

  return (
    <main className="screen">
      <div className="year-top">
        <div>
          <h1>{t.checkpoint.title(yearLabel(checkpoint.date, display))}</h1>
          <p className="year-date">
            {t.year.workedOutOn(formatDate(checkpoint.date, display, locale))}
          </p>
        </div>
        <span className={`pill ${status.state}`}>{t.home.state[status.state]}</span>
      </div>

      {dirty && status.state !== 'draft' && (
        <p className="note warn-note">{notice ?? t.year.finishedNudge}</p>
      )}

      {status.state === 'draft' && (
        <div className="actions">
          <button className="btn" type="button" onClick={onEdit}>
            {t.year.continueDraft}
          </button>
          <button
            className="btn quiet"
            type="button"
            onClick={() => {
              setConfirmDiscard(true);
            }}
          >
            {t.year.discard}
          </button>
        </div>
      )}

      {status.state === 'nothing-due' && <p className="note">{t.nothingDue[status.reason]}</p>}

      {(status.state === 'due' || status.state === 'settled' || status.state === 'overpaid') && (
        <>
          <YearFigures status={status} currency={base} />
          <section className="list" aria-labelledby="payments-title">
            <div className="list-head">
              <h2 id="payments-title">{t.year.payments}</h2>
              {!adding && (
                <button
                  className="btn small"
                  type="button"
                  onClick={() => {
                    setAdding(true);
                  }}
                >
                  {t.year.addPayment}
                </button>
              )}
            </div>
            {adding && (
              <PaymentForm
                checkpoint={checkpoint}
                baseCurrency={base}
                onDone={(added) => {
                  setAdding(false);
                  if (added) setNotice(t.payment.added);
                }}
              />
            )}
            {payments.length === 0 && !adding && <p className="hint">{t.year.noPayments}</p>}
            {payments.map((p) => (
              <div key={p.id} className="row">
                <div className="row-main">
                  <span className="row-title">{nameOf(p.recipientId)}</span>
                  <span className="row-sub">
                    {formatDate(p.date, display, locale)}
                    {p.sent.currency !== base
                      ? ` (${t.year.sent(money(p.sent.amount, p.sent.currency), p.sent.currency)})`
                      : ''}
                  </span>
                  {p.note && <span className="row-sub">{p.note}</span>}
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => {
                      setConfirmDelete(p.id);
                    }}
                    aria-label={`${t.year.delete}: ${nameOf(p.recipientId)}`}
                  >
                    {t.year.delete}
                  </button>
                </div>
                <span className="amount num">
                  {money(p.baseValue)} <span className="ccy">{base}</span>
                </span>
              </div>
            ))}
          </section>
        </>
      )}

      {checkpoint.status === 'finalised' && (
        <details className="more">
          <summary>{t.year.breakdown}</summary>
          <div className="stack">
            <Breakdown
              result={checkpoint.frozen.result}
              checkpoint={checkpoint}
              profile={profile}
            />
            <h3>{t.review.settingsUsed}</h3>
            <SettingsUsed settings={checkpoint.frozen.settings} />
            <p className="note">{t.notAFatwa}</p>
            <div className="actions">
              <button
                className="btn quiet small"
                type="button"
                onClick={() => {
                  setConfirmReopen(true);
                }}
              >
                {t.year.reopen}
              </button>
            </div>
          </div>
        </details>
      )}

      {toDelete && (
        <Confirm
          title={t.year.deleteTitle}
          confirmLabel={t.year.deleteConfirm}
          onCancel={() => {
            setConfirmDelete(null);
          }}
          onConfirm={() => {
            update((p) => removePayment(p, toDelete.id));
            setConfirmDelete(null);
          }}
        >
          <p>
            {t.year.deleteBody(
              `${money(toDelete.baseValue)} ${base}`,
              nameOf(toDelete.recipientId),
            )}
          </p>
        </Confirm>
      )}
      {confirmDiscard && (
        <Confirm
          title={t.year.discardTitle}
          confirmLabel={t.year.discardConfirm}
          onCancel={() => {
            setConfirmDiscard(false);
          }}
          onConfirm={() => {
            setConfirmDiscard(false);
            onDiscarded();
            update((p) => discardDraft(p, checkpointId));
          }}
        >
          <p>{t.year.discardBody}</p>
        </Confirm>
      )}
      {confirmReopen && (
        <Confirm
          title={t.year.reopenTitle}
          confirmLabel={t.year.reopenConfirm}
          onCancel={() => {
            setConfirmReopen(false);
          }}
          onConfirm={() => {
            update((p) => reopenCheckpoint(p, checkpointId));
            setConfirmReopen(false);
            onEdit();
          }}
        >
          <p>{t.year.reopenBody}</p>
          {payments.length > 0 && (
            <p className="note warn-note">{t.year.reopenPayments(payments.length)}</p>
          )}
        </Confirm>
      )}
    </main>
  );
}
