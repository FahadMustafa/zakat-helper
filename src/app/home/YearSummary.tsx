import { Dec } from '../../engine/money';
import type { YearStatus } from '../../engine/ledger';
import { useLocale, useT } from '../i18n/locale';
import { formatAmount } from '../numbers';

export type Settled = Extract<YearStatus, { state: 'due' | 'settled' | 'overpaid' }>;

/** Due, paid, remaining and a bar that fills as payments come in. */
export function YearFigures({ status, currency }: { status: Settled; currency: string }) {
  const t = useT().year;
  const locale = useLocale();
  const money = (v: string) => formatAmount(v, currency, locale);
  const due = Dec.parse(status.due);
  const paid = Dec.parse(status.paid);
  const pct = due.isZero()
    ? 100
    : Math.min(100, Math.round(Number(paid.mul(Dec.fromInt(100)).div(due).round(0).toString())));
  const last =
    status.state === 'due'
      ? { label: t.remaining, value: status.remaining }
      : status.state === 'overpaid'
        ? { label: t.over, value: status.over }
        : { label: t.remaining, value: '0' };
  return (
    <>
      <div className="figures">
        <div className="fig">
          <span className="fig-label">{t.due}</span>
          <span className="fig-value num">
            {money(status.due)} <small>{currency}</small>
          </span>
        </div>
        <div className="fig">
          <span className="fig-label">{t.paid}</span>
          <span className="fig-value num">
            {money(status.paid)} <small>{currency}</small>
          </span>
        </div>
        <div className="fig remaining">
          <span className="fig-label">{last.label}</span>
          <span className="fig-value num">
            {money(last.value)} <small>{currency}</small>
          </span>
        </div>
      </div>
      <div className="bar" role="img" aria-label={`${pct}%`}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}
