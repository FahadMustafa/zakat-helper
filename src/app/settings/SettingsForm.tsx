import { Choice } from '../components/Choice';
import type { Settings } from '../../engine/schema';
import { useLocale, useT } from '../i18n/locale';
import { SOURCES, type Source } from './sources';

const COMMON = [
  'SAR',
  'AED',
  'KWD',
  'QAR',
  'BHD',
  'OMR',
  'EGP',
  'JOD',
  'USD',
  'EUR',
  'GBP',
  'PKR',
  'INR',
  'MYR',
  'IDR',
  'TRY',
];

function Sources({ list }: { list: readonly Source[] }) {
  const t = useT();
  return (
    <p className="src">
      {t.settings.sources}:{' '}
      {list.map((s, i) => (
        <span key={s.url}>
          {i > 0 && ', '}
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.label}
          </a>
        </span>
      ))}
    </p>
  );
}

function CurrencySelect({
  value,
  onChange,
  locked,
}: {
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
}) {
  const locale = useLocale();
  const t = useT();
  const names = new Intl.DisplayNames([locale], { type: 'currency' });
  const all = Intl.supportedValuesOf('currency');
  const rest = all.filter((c) => !COMMON.includes(c));
  const option = (c: string) => (
    <option key={c} value={c}>
      {c} · {names.of(c) ?? c}
    </option>
  );
  return (
    <div className="field">
      <label htmlFor="base-currency">{t.settings.baseCurrency.title}</label>
      <select
        id="base-currency"
        disabled={locked}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      >
        <optgroup label="">{COMMON.filter((c) => all.includes(c)).map(option)}</optgroup>
        <optgroup label="—">{rest.map(option)}</optgroup>
      </select>
      <small className="hint">
        {locked ? t.settings.baseCurrency.locked : t.settings.baseCurrency.detail}
      </small>
    </div>
  );
}

/** The rule settings, shared by first run and the Settings screen. */
export function SettingsForm({
  value,
  onChange,
  currencyLocked = false,
}: {
  value: Settings;
  onChange: (s: Settings) => void;
  currencyLocked?: boolean;
}) {
  const t = useT().settings;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    onChange({ ...value, [k]: v });
  };
  const bool = (b: boolean) => (b ? 'yes' : 'no');
  return (
    <div className="settings">
      <CurrencySelect
        locked={currencyLocked}
        value={value.baseCurrency}
        onChange={(v) => {
          set('baseCurrency', v);
        }}
      />
      <Choice
        name="dateDisplay"
        title={t.dateDisplay.title}
        value={value.dateDisplay}
        onChange={(v) => {
          set('dateDisplay', v);
        }}
        options={[
          { value: 'both', label: t.dateDisplay.both },
          { value: 'hijri', label: t.dateDisplay.hijri },
          { value: 'gregorian', label: t.dateDisplay.gregorian },
        ]}
      />
      <Choice
        name="yearRule"
        title={t.yearRule.title}
        value={value.yearRule}
        onChange={(v) => {
          set('yearRule', v);
        }}
        options={[
          { value: 'whole-balance', ...t.yearRule['whole-balance'] },
          { value: 'lowest-balance', ...t.yearRule['lowest-balance'] },
        ]}
        footer={<Sources list={SOURCES.yearRule} />}
      />
      <Choice
        name="yearType"
        title={t.yearType.title}
        value={value.yearType}
        onChange={(v) => {
          set('yearType', v);
        }}
        options={[
          { value: 'lunar', ...t.yearType.lunar },
          { value: 'solar', ...t.yearType.solar },
        ]}
        footer={<Sources list={SOURCES.yearType} />}
      />
      <Choice
        name="nisabBasis"
        title={t.nisabBasis.title}
        value={value.nisabBasis}
        onChange={(v) => {
          set('nisabBasis', v);
        }}
        options={[
          { value: 'silver', ...t.nisabBasis.silver },
          { value: 'gold', ...t.nisabBasis.gold },
        ]}
        footer={<Sources list={SOURCES.nisabBasis} />}
      />
      <Choice
        name="jewelleryZakatable"
        title={t.jewelleryZakatable.title}
        value={bool(value.jewelleryZakatable)}
        onChange={(v) => {
          set('jewelleryZakatable', v === 'yes');
        }}
        options={[
          { value: 'yes', ...t.jewelleryZakatable.yes },
          { value: 'no', ...t.jewelleryZakatable.no },
        ]}
        footer={<Sources list={SOURCES.jewelleryZakatable} />}
      />
      <Choice
        name="deductDebts"
        title={t.deductDebts.title}
        value={bool(value.deductDebts)}
        onChange={(v) => {
          set('deductDebts', v === 'yes');
        }}
        options={[
          { value: 'no', ...t.deductDebts.no },
          { value: 'yes', ...t.deductDebts.yes },
        ]}
        footer={<Sources list={SOURCES.deductDebts} />}
      />
      <Choice
        name="deductUnpaidPriorZakat"
        title={t.deductUnpaidPriorZakat.title}
        value={bool(value.deductUnpaidPriorZakat)}
        onChange={(v) => {
          set('deductUnpaidPriorZakat', v === 'yes');
        }}
        options={[
          { value: 'yes', ...t.deductUnpaidPriorZakat.yes },
          { value: 'no', ...t.deductUnpaidPriorZakat.no },
        ]}
        footer={<Sources list={SOURCES.deductUnpaidPriorZakat} />}
      />
    </div>
  );
}
