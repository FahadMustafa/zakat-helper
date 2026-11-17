import { useState } from 'react';
import { canPayInAdvance, outstandingYears, yearStatus } from '../../engine/ledger';
import { formatDate, yearLabel } from '../dates';
import { useLocale, useT } from '../i18n/locale';
import { formatAmount } from '../numbers';
import { PaymentForm } from '../payments/PaymentForm';
import { useOpenProfile } from '../storage/sessionContext';
import { YearFigures } from './YearSummary';

export function Home({
  onStart,
  onOpenYear,
}: {
  onStart: () => void;
  onOpenYear: (checkpointId: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { profile } = useOpenProfile();
  const [advance, setAdvance] = useState(false);
  const display = profile.settings.dateDisplay;
  const years = [...profile.checkpoints].sort((a, b) => b.date.localeCompare(a.date));
  const hasDraft = years.some((c) => c.status === 'draft');
  const current = years.find((c) => c.status === 'finalised');
  const currentStatus = current ? yearStatus(profile, current.id) : undefined;
  const outstanding = outstandingYears(profile).filter((o) => o.checkpointId !== current?.id);
  const advancePayments = profile.payments.filter((p) => p.appliesTo.kind === 'advance');
  const label = (id: string) => {
    const c = profile.checkpoints.find((x) => x.id === id);
    return c ? yearLabel(c.date, display) : id;
  };
  const base = profile.settings.baseCurrency;

  if (years.length === 0) {
    return (
      <main className="screen">
        <h1>{t.home.title}</h1>
        <p className="note">{t.home.empty}</p>
        <div className="actions">
          <button className="btn" type="button" onClick={onStart}>
            {t.home.start}
          </button>
        </div>
        <p className="hint">{t.common.privacy}</p>
      </main>
    );
  }

  return (
    <main className="screen">
      {current &&
        currentStatus &&
        (currentStatus.state === 'due' ||
          currentStatus.state === 'settled' ||
          currentStatus.state === 'overpaid') && (
          <article className="year" aria-labelledby="current-year">
            <div className="year-top">
              <div>
                <h1 id="current-year">{t.checkpoint.title(yearLabel(current.date, display))}</h1>
                <p className="year-date">
                  {t.year.workedOutOn(formatDate(current.date, display, locale))}
                </p>
              </div>
              <span className={`pill ${currentStatus.state}`}>
                {t.home.state[currentStatus.state]}
              </span>
            </div>
            <YearFigures status={currentStatus} currency={current.baseCurrency} />
            <div className="actions">
              <button
                className="btn"
                type="button"
                onClick={() => {
                  onOpenYear(current.id);
                }}
              >
                {currentStatus.state === 'due' ? t.year.addPayment : t.year.payments}
              </button>
            </div>
          </article>
        )}

      {outstanding.map((o) => (
        <p key={o.checkpointId} className="note warn-note">
          {t.home.outstanding(
            label(o.checkpointId),
            `${formatAmount(o.remaining, base, locale)} ${base}`,
          )}
        </p>
      ))}

      <section className="list" aria-labelledby="all-years">
        <div className="list-head">
          <h2 id="all-years">{t.home.all}</h2>
          <button className="btn small" type="button" onClick={onStart}>
            {hasDraft ? t.home.continueDraft : t.home.start}
          </button>
        </div>
        {years.map((c) => {
          const s = yearStatus(profile, c.id);
          const amount =
            s.state === 'due'
              ? s.remaining
              : s.state === 'settled' || s.state === 'overpaid'
                ? s.due
                : undefined;
          return (
            <button
              key={c.id}
              type="button"
              className="row link"
              onClick={() => {
                onOpenYear(c.id);
              }}
            >
              <span className="row-main">
                <span className="row-title">{yearLabel(c.date, display)}</span>
                <span className="row-sub">{formatDate(c.date, display, locale)}</span>
              </span>
              <span className={`pill ${s.state}`}>{t.home.state[s.state]}</span>
              <span className="amount num">
                {amount === undefined ? '' : `${formatAmount(amount, c.baseCurrency, locale)} `}
                {amount === undefined ? '' : <span className="ccy">{c.baseCurrency}</span>}
              </span>
            </button>
          );
        })}
      </section>

      {(advancePayments.length > 0 || canPayInAdvance(profile)) && (
        <section className="list" aria-labelledby="advance">
          <div className="list-head">
            <h2 id="advance">{t.home.advanceTitle}</h2>
            {canPayInAdvance(profile) && !advance && (
              <button
                className="btn small quiet"
                type="button"
                onClick={() => {
                  setAdvance(true);
                }}
              >
                {t.home.advanceAdd}
              </button>
            )}
          </div>
          {advance && (
            <PaymentForm
              checkpoint={undefined}
              baseCurrency={base}
              onDone={() => {
                setAdvance(false);
              }}
            />
          )}
          {advancePayments.map((p) => (
            <div key={p.id} className="row">
              <span className="row-main">
                <span className="row-title">
                  {profile.recipients.find((r) => r.id === p.recipientId)?.name}
                </span>
                <span className="row-sub">{formatDate(p.date, display, locale)}</span>
              </span>
              <span />
              <span className="amount num">
                {formatAmount(p.baseValue, base, locale)} <span className="ccy">{base}</span>
              </span>
            </div>
          ))}
        </section>
      )}
      <p className="hint">{t.common.privacy}</p>
    </main>
  );
}
