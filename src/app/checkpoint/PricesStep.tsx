import { useState } from 'react';
import type { Checkpoint } from '../../engine/schema';
import { AmountInput } from '../components/AmountInput';
import { Choice } from '../components/Choice';
import { formatDate, hijriParts, hijriToIso } from '../dates';
import { useLocale, useT } from '../i18n/locale';
import { useOpenProfile } from '../storage/sessionContext';
import { metalsNeeded, updateCheckpoint } from './draft';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function HijriEntry({ iso, onDate }: { iso: string; onDate: (iso: string) => void }) {
  const t = useT().checkpoint;
  const locale = useLocale();
  const current = hijriParts(iso);
  const [error, setError] = useState(false);
  const monthName = (m: number) => {
    const sample = hijriToIso(current.year, m, 1);
    if (!sample) return String(m);
    return new Intl.DateTimeFormat(
      `${locale === 'ar' ? 'ar-SA' : 'en-GB'}-u-ca-islamic-umalqura-nu-latn`,
      { month: 'long', timeZone: 'UTC' },
    ).format(new Date(`${sample}T00:00:00Z`));
  };
  const set = (y: number, m: number, d: number) => {
    const next = hijriToIso(y, m, d);
    setError(next === null);
    if (next) onDate(next);
  };
  return (
    <fieldset className="setting">
      <legend className="label">{t.hijriEntry}</legend>
      <div className="grid-3">
        <div className="field">
          <label htmlFor="h-day">{t.day}</label>
          <select
            id="h-day"
            value={current.day}
            onChange={(e) => {
              set(current.year, current.month, Number(e.target.value));
            }}
          >
            {Array.from({ length: 30 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="h-month">{t.month}</label>
          <select
            id="h-month"
            value={current.month}
            onChange={(e) => {
              set(current.year, Number(e.target.value), current.day);
            }}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="h-year">{t.year}</label>
          <select
            id="h-year"
            value={current.year}
            onChange={(e) => {
              set(Number(e.target.value), current.month, current.day);
            }}
          >
            {Array.from({ length: 11 }, (_, i) => current.year - 5 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <small className="error-text" role="alert">
          {t.noSuchDay}
        </small>
      )}
    </fieldset>
  );
}

export function PricesStep({
  checkpoint,
  previous,
}: {
  checkpoint: Checkpoint;
  previous: Checkpoint | undefined;
}) {
  const t = useT().checkpoint;
  const locale = useLocale();
  const { profile, update } = useOpenProfile();
  const change = (f: (c: Checkpoint) => Checkpoint) => {
    update((p) => updateCheckpoint(p, checkpoint.id, f));
  };
  const base = checkpoint.baseCurrency;

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="cp-date">{t.date}</label>
        <input
          id="cp-date"
          type="date"
          value={checkpoint.date}
          onChange={(e) => {
            if (e.target.value) change((c) => ({ ...c, date: e.target.value }));
          }}
        />
        <small className="hint">{formatDate(checkpoint.date, 'both', locale)}</small>
      </div>
      <HijriEntry
        key={checkpoint.date}
        iso={checkpoint.date}
        onDate={(date) => {
          change((c) => ({ ...c, date }));
        }}
      />

      {previous === undefined && (
        <Choice<'yes' | 'no' | 'unset'>
          name="first-year"
          title={t.firstYearQuestion}
          value={
            checkpoint.heldNisabAtPrevious === undefined
              ? 'unset'
              : checkpoint.heldNisabAtPrevious
                ? 'yes'
                : 'no'
          }
          onChange={(v) => {
            change((c) => ({ ...c, heldNisabAtPrevious: v === 'yes' }));
          }}
          options={[
            { value: 'yes', label: t.firstYearYes },
            { value: 'no', label: t.firstYearNo, detail: t.firstYearDetail },
          ]}
        />
      )}

      {metalsNeeded(profile, checkpoint.id).map((metal) => {
        const last = previous?.prices.metalPerGramPure[metal];
        return (
          <AmountInput
            key={`${checkpoint.id}-${metal}`}
            id={`price-${metal}`}
            label={t.metalPrice(metal, base)}
            value={checkpoint.prices.metalPerGramPure[metal]}
            {...(last ? { hint: t.lastYear(last) } : {})}
            onCommit={(v) => {
              change((c) => {
                const m = c.prices.metalPerGramPure;
                const other = metal === 'gold' ? 'silver' : 'gold';
                const metalPerGramPure = {
                  ...(m[other] === undefined ? {} : { [other]: m[other] }),
                  ...(v === undefined ? {} : { [metal]: v }),
                };
                return { ...c, prices: { ...c.prices, metalPerGramPure } };
              });
            }}
          />
        );
      })}
    </div>
  );
}
