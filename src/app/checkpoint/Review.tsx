import { computeCheckpoint } from '../../engine/calculate';
import { finaliseCheckpoint } from '../../engine/ledger';
import { Dec } from '../../engine/money';
import type { Checkpoint, Missing, OkResult, Profile, Settings } from '../../engine/schema';
import { AmountInput } from '../components/AmountInput';
import { yearLabel } from '../dates';
import { useLocale, useT } from '../i18n/locale';
import type { Messages } from '../i18n';
import { formatAmount, percent } from '../numbers';
import { useOpenProfile } from '../storage/sessionContext';
import { insertMissingYear, updateCheckpoint } from './draft';

function missingText(t: Messages, m: Missing, profile: Profile): string {
  switch (m.kind) {
    case 'holding-price':
      return t.missing['holding-price'](
        profile.holdings.find((h) => h.id === m.holdingId)?.name ?? m.holdingId,
      );
    case 'fx':
      return t.missing.fx(m.currency);
    case 'metal-price':
      return t.missing['metal-price'](m.metal);
    case 'first-year-answer':
      return t.missing['first-year-answer'];
    case 'previous-incomplete': {
      const c = profile.checkpoints.find((x) => x.id === m.checkpointId);
      return t.missing['previous-incomplete'](
        c ? yearLabel(c.date, profile.settings.dateDisplay) : m.checkpointId,
      );
    }
  }
}

export function SettingsUsed({ settings }: { settings: Settings }) {
  const s = useT().settings;
  const items = [
    s.yearRule[settings.yearRule].label,
    s.yearType[settings.yearType].label,
    s.nisabBasis[settings.nisabBasis].label,
    `${s.jewelleryZakatable.title}: ${s.jewelleryZakatable[settings.jewelleryZakatable ? 'yes' : 'no'].label}`,
    `${s.deductDebts.title}: ${s.deductDebts[settings.deductDebts ? 'yes' : 'no'].label}`,
    `${s.deductUnpaidPriorZakat.title}: ${s.deductUnpaidPriorZakat[settings.deductUnpaidPriorZakat ? 'yes' : 'no'].label}`,
  ];
  return (
    <ul className="issues hint">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/** The per-holding breakdown, totals, nisab and outcome. Read-only. */
export function Breakdown({
  result,
  checkpoint,
  profile,
}: {
  result: OkResult;
  checkpoint: Checkpoint;
  profile: Profile;
}) {
  const t = useT();
  const locale = useLocale();
  const base = checkpoint.baseCurrency;
  const money = (v: string) => formatAmount(v, base, locale);
  const nameOf = (id: string) => profile.holdings.find((h) => h.id === id)?.name ?? id;
  const settings =
    checkpoint.status === 'finalised' ? checkpoint.frozen.settings : profile.settings;
  const grams = settings.nisabBasis === 'gold' ? '85' : '595';
  const positive = (v: string) => Dec.parse(v).cmp(Dec.ZERO) > 0;
  return (
    <div className="calc">
      {result.lines.map((l) => {
        const counted = positive(l.zakatableValue);
        const isDebt = l.reason === 'deducted-debt' || l.reason === 'debt-not-deducted';
        return (
          <div key={l.holdingId} className={`row${counted ? '' : ' excluded'}`}>
            <div className="row-main">
              <span className="row-title">{nameOf(l.holdingId)}</span>
              {l.reason !== 'counted' && <span className="row-sub">{t.lineReason[l.reason]}</span>}
            </div>
            <span className="amount num">
              {isDebt && counted ? '−' : ''}
              {positive(l.value) || counted ? money(counted ? l.zakatableValue : l.value) : '–'}
            </span>
          </div>
        );
      })}
      <div className="row total">
        <div className="row-main">
          <span className="row-title">{t.review.zakatableTotal}</span>
        </div>
        <span className="amount num">{money(result.zakatableTotal)}</span>
      </div>
      {positive(result.deductions) && (
        <div className="row">
          <div className="row-main">
            <span className="row-title">{t.review.deductions}</span>
          </div>
          <span className="amount num">−{money(result.deductions)}</span>
        </div>
      )}
      {positive(result.unpaidPriorZakat) && (
        <div className="row">
          <div className="row-main">
            <span className="row-title">{t.review.unpaidPrior}</span>
          </div>
          <span className="amount num">−{money(result.unpaidPriorZakat)}</span>
        </div>
      )}
      {result.estimate !== undefined && (
        <div className="row">
          <div className="row-main">
            <span className="row-title">{t.review.estimate}</span>
            <span className="row-sub">{t.review.estimateDetail}</span>
          </div>
          <span className="amount num">{money(result.estimate)}</span>
        </div>
      )}
      <div className="row total">
        <div className="row-main">
          <span className="row-title">{t.review.base}</span>
          <span className="row-sub">
            {t.review.nisab(settings.nisabBasis, grams, `${money(result.nisabThreshold)} ${base}`)}
          </span>
        </div>
        <span className="amount num">{money(result.base)}</span>
      </div>
      <div className="due-line">
        {result.outcome.kind === 'due' ? (
          <div className="fig">
            <span className="fig-label">{t.review.due(percent(result.rate))}</span>
            <span className="fig-value num">
              {money(result.outcome.due)} <small>{base}</small>
            </span>
          </div>
        ) : (
          <p className="note">{t.nothingDue[result.outcome.reason]}</p>
        )}
      </div>
    </div>
  );
}

export function Review({
  checkpointId,
  goPrices,
  goHoldings,
  onFinished,
  onOpenCheckpoint,
}: {
  checkpointId: string;
  goPrices: () => void;
  goHoldings: () => void;
  onFinished: () => void;
  onOpenCheckpoint: (id: string) => void;
}) {
  const t = useT();
  const { profile, update } = useOpenProfile();
  const checkpoint = profile.checkpoints.find((c) => c.id === checkpointId);
  if (!checkpoint) throw new Error(`Unknown checkpoint ${checkpointId}`);
  const result = computeCheckpoint(profile, checkpointId);
  const change = (f: (c: Checkpoint) => Checkpoint) => {
    update((p) => updateCheckpoint(p, checkpointId, f));
  };

  if (!result.ok) {
    return (
      <div className="stack">
        <h2>{t.review.missingTitle}</h2>
        <ul className="issues">
          {result.missing.map((m) => (
            <li key={JSON.stringify(m)}>{missingText(t, m, profile)}</li>
          ))}
        </ul>
        <div className="actions">
          <button className="btn quiet" type="button" onClick={goPrices}>
            {t.review.goPrices}
          </button>
          <button className="btn" type="button" onClick={goHoldings}>
            {t.review.goHoldings}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {result.warnings.map((w) => (
        <div key={w} className="note warn-note stack">
          <span>{t.warning[w]}</span>
          {w === 'gap-too-long' && (
            <div className="actions">
              <button
                className="btn small"
                type="button"
                onClick={() => {
                  const id = crypto.randomUUID();
                  update((p) => insertMissingYear(p, checkpointId, id));
                  onOpenCheckpoint(id);
                }}
              >
                {t.review.addMissingYear}
              </button>
            </div>
          )}
        </div>
      ))}
      <Breakdown result={result} checkpoint={checkpoint} profile={profile} />
      {profile.settings.yearRule === 'lowest-balance' && (
        <div className="stack">
          <AmountInput
            id={`${checkpointId}-override`}
            label={t.review.override}
            hint={t.review.overrideDetail}
            value={checkpoint.lowestBalanceOverride}
            onCommit={(v) => {
              change((c) => {
                const { lowestBalanceOverride: _drop, ...rest } = c;
                return v === undefined ? rest : { ...rest, lowestBalanceOverride: v };
              });
            }}
          />
          <label className="check" htmlFor={`${checkpointId}-dipped`}>
            <input
              id={`${checkpointId}-dipped`}
              type="checkbox"
              checked={checkpoint.dippedBelowNisab === true}
              onChange={(e) => {
                change((c) => ({ ...c, dippedBelowNisab: e.target.checked }));
              }}
            />
            <span>{t.review.dipped}</span>
          </label>
        </div>
      )}
      <section className="stack" aria-labelledby="settings-used">
        <h3 id="settings-used">{t.review.settingsUsed}</h3>
        <SettingsUsed settings={profile.settings} />
        <p className="note">{t.notAFatwa}</p>
      </section>
      <p className="hint">{t.review.finaliseDetail}</p>
      <div className="actions">
        <button className="btn quiet" type="button" onClick={goHoldings}>
          {t.checkpoint.backToHoldings}
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            update((p) => {
              const r = finaliseCheckpoint(p, checkpointId, new Date().toISOString());
              return r.kind === 'finalised' ? r.profile : p;
            });
            onFinished();
          }}
        >
          {t.review.finalise}
        </button>
      </div>
    </div>
  );
}
