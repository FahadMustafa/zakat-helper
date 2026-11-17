import { useState } from 'react';
import type { Checkpoint, Entry, Holding, HoldingKind } from '../../engine/schema';
import { AmountInput } from '../components/AmountInput';
import { useLocale, useT } from '../i18n/locale';
import { useOpenProfile } from '../storage/sessionContext';
import {
  addHolding,
  closeHolding,
  currenciesInUse,
  updateCheckpoint,
  updateEntry,
  withKey,
} from './draft';

const KINDS: HoldingKind[] = [
  'cash',
  'gold',
  'silver',
  'shares',
  'property',
  'receivable',
  'liability',
  'other',
];

/** The headline quantity of an entry, for the "last year" column. */
function quantityOf(e: Entry): string | undefined {
  switch (e.kind) {
    case 'cash':
    case 'receivable':
    case 'other':
      return e.amount;
    case 'gold':
    case 'silver':
      return e.grams;
    case 'shares':
      return e.count;
    case 'liability':
      return e.deductibleAmount;
    case 'property':
      return undefined;
  }
}

function currencyOf(h: Holding, base: string): string {
  return h.kind === 'gold' || h.kind === 'silver' ? base : h.currency;
}

function Check({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      <span>{label}</span>
    </label>
  );
}

function HoldingRow({
  holding,
  entry,
  last,
  checkpoint,
}: {
  holding: Holding;
  entry: Entry;
  last: Entry | undefined;
  checkpoint: Checkpoint;
}) {
  const t = useT().checkpoint;
  const locale = useLocale();
  const { update } = useOpenProfile();
  const base = checkpoint.baseCurrency;
  const ccy = currencyOf(holding, base);
  const id = `${checkpoint.id}-${holding.id}`;
  const set = (e: Entry) => {
    update((p) => updateEntry(p, checkpoint.id, e));
  };
  const setPrice = (v: string | undefined) => {
    update((p) =>
      updateCheckpoint(p, checkpoint.id, (c) => {
        return {
          ...c,
          prices: { ...c.prices, perHolding: withKey(c.prices.perHolding, holding.id, v) },
        };
      }),
    );
  };
  const lastQty = last ? quantityOf(last) : undefined;
  const qtyLabel =
    typeof t.quantity[entry.kind] === 'function'
      ? (t.quantity[entry.kind] as (c: string) => string)(ccy)
      : (t.quantity[entry.kind] as string);
  const commitQty = (v: string | undefined) => {
    const q = v ?? '0';
    switch (entry.kind) {
      case 'cash':
      case 'receivable':
      case 'other':
        set({ ...entry, amount: q });
        return;
      case 'gold':
      case 'silver':
        set({ ...entry, grams: q });
        return;
      case 'shares':
        set({ ...entry, count: q });
        return;
      case 'liability':
        set({ ...entry, deductibleAmount: q });
        return;
      case 'property':
        setPrice(v);
    }
  };
  const currentQty =
    entry.kind === 'property' ? checkpoint.prices.perHolding[holding.id] : quantityOf(entry);

  return (
    <div className="holding">
      <div className="row-main">
        <span className="row-title">{holding.name}</span>
        <span className="kind">
          {holding.kind === 'gold' || holding.kind === 'silver'
            ? t.kinds[holding.kind]
            : t.kindWithCurrency(t.kinds[holding.kind], ccy)}
        </span>
      </div>
      <span className="last num">
        {lastQty === undefined
          ? '–'
          : new Intl.NumberFormat(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en').format(
              lastQty as Intl.StringNumericLiteral,
            )}
      </span>
      <AmountInput
        key={`${id}-qty`}
        id={`${id}-qty`}
        label={`${holding.name}: ${qtyLabel}`}
        hideLabel
        value={currentQty === '0' ? '' : currentQty}
        onCommit={commitQty}
      />
      <details className="more">
        <summary>{t.details}</summary>
        <div className="stack">
          <p className="hint">{qtyLabel}</p>
          {entry.kind === 'gold' && (
            <div className="field">
              <label htmlFor={`${id}-karat`}>{t.karat}</label>
              <select
                id={`${id}-karat`}
                value={entry.karat}
                onChange={(e) => {
                  set({ ...entry, karat: Number(e.target.value) });
                }}
              >
                {[24, 22, 21, 18, 14, 12, 10, 9].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          )}
          {entry.kind === 'silver' && (
            <div className="field">
              <label htmlFor={`${id}-fineness`}>{t.fineness}</label>
              <select
                id={`${id}-fineness`}
                value={entry.fineness}
                onChange={(e) => {
                  set({ ...entry, fineness: Number(e.target.value) });
                }}
              >
                {[999, 958, 925, 900, 835, 800].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(entry.kind === 'gold' || entry.kind === 'silver') && (
            <Check
              id={`${id}-jewel`}
              label={t.jewellery}
              checked={entry.personalJewellery}
              onChange={(v) => {
                set({ ...entry, personalJewellery: v });
              }}
            />
          )}
          {entry.kind === 'shares' && (
            <>
              <AmountInput
                id={`${id}-price`}
                label={t.sharePrice(ccy)}
                value={checkpoint.prices.perHolding[holding.id]}
                onCommit={setPrice}
              />
              <Check
                id={`${id}-trading`}
                label={t.trading}
                checked={entry.treatment.kind === 'trading'}
                onChange={(v) => {
                  set({
                    ...entry,
                    treatment: v
                      ? { kind: 'trading' }
                      : { kind: 'long-term', zakatableFraction: '0.25' },
                  });
                }}
              />
              {entry.treatment.kind === 'long-term' && (
                <AmountInput
                  id={`${id}-fraction`}
                  label={t.fraction}
                  max="1"
                  value={entry.treatment.zakatableFraction}
                  onCommit={(v) => {
                    set({
                      ...entry,
                      treatment: { kind: 'long-term', zakatableFraction: v ?? '0.25' },
                    });
                  }}
                />
              )}
              <Check
                id={`${id}-company`}
                label={t.companyPays}
                checked={entry.companyPaysZakat}
                onChange={(v) => {
                  set({ ...entry, companyPaysZakat: v });
                }}
              />
            </>
          )}
          {entry.kind === 'property' && (
            <Check
              id={`${id}-sale`}
              label={t.forSale}
              checked={entry.forSale}
              onChange={(v) => {
                set({ ...entry, forSale: v });
              }}
            />
          )}
          {entry.kind === 'receivable' && (
            <Check
              id={`${id}-collect`}
              label={t.collectable}
              checked={entry.collectable}
              onChange={(v) => {
                set({ ...entry, collectable: v });
              }}
            />
          )}
          {entry.kind === 'other' && (
            <>
              <div className="field">
                <label htmlFor={`${id}-cat`}>{t.category}</label>
                <select
                  id={`${id}-cat`}
                  value={entry.category}
                  onChange={(e) => {
                    set({ ...entry, category: e.target.value as typeof entry.category });
                  }}
                >
                  {(['pension', 'crypto', 'goods-for-sale', 'other'] as const).map((c) => (
                    <option key={c} value={c}>
                      {t.categories[c]}
                    </option>
                  ))}
                </select>
              </div>
              <Check
                id={`${id}-zak`}
                label={t.zakatable}
                checked={entry.zakatable}
                onChange={(v) => {
                  set({ ...entry, zakatable: v });
                }}
              />
            </>
          )}
          <div className="actions">
            <button
              className="btn quiet small"
              type="button"
              onClick={() => {
                update((p) => closeHolding(p, checkpoint.id, holding.id));
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}

function AddHolding({ checkpoint }: { checkpoint: Checkpoint }) {
  const t = useT().checkpoint;
  const { update } = useOpenProfile();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<HoldingKind>('cash');
  const [currency, setCurrency] = useState(checkpoint.baseCurrency);
  const currencies = Intl.supportedValuesOf('currency');
  return (
    <form
      className="stack note"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        const id = crypto.randomUUID();
        const h: Holding =
          kind === 'gold' || kind === 'silver'
            ? { id, kind, name: trimmed }
            : { id, kind, name: trimmed, currency };
        update((p) => addHolding(p, checkpoint.id, h));
        setName('');
      }}
    >
      <h3>{t.addTitle}</h3>
      <div className="field">
        <label htmlFor="add-name">{t.addName}</label>
        <input
          id="add-name"
          type="text"
          value={name}
          placeholder={t.addNameHint}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="add-kind">{t.addKind}</label>
          <select
            id="add-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as HoldingKind);
            }}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t.kinds[k]}
              </option>
            ))}
          </select>
        </div>
        {kind !== 'gold' && kind !== 'silver' && (
          <div className="field">
            <label htmlFor="add-currency">{t.addCurrency}</label>
            <select
              id="add-currency"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
              }}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="actions">
        <button className="btn" type="submit" disabled={name.trim() === ''}>
          {t.add}
        </button>
      </div>
    </form>
  );
}

export function HoldingsStep({
  checkpoint,
  previous,
}: {
  checkpoint: Checkpoint;
  previous: Checkpoint | undefined;
}) {
  const t = useT().checkpoint;
  const { profile, update } = useOpenProfile();
  const base = checkpoint.baseCurrency;
  const currencies = currenciesInUse(profile, checkpoint.id);
  const holdingFor = (id: string) => {
    const h = profile.holdings.find((x) => x.id === id);
    if (!h) throw new Error(`Unknown holding ${id}`);
    return h;
  };

  return (
    <div className="stack">
      <p>{previous ? t.holdIntro : t.holdIntroFirst}</p>
      {checkpoint.entries.length > 0 && (
        <div>
          <div className="holding holding-head">
            <span>{t.head.holding}</span>
            <span>{t.head.last}</span>
            <span>{t.head.now}</span>
          </div>
          {checkpoint.entries.map((e) => (
            <HoldingRow
              key={e.holdingId}
              holding={holdingFor(e.holdingId)}
              entry={e}
              last={previous?.entries.find((x) => x.holdingId === e.holdingId)}
              checkpoint={checkpoint}
            />
          ))}
        </div>
      )}
      <AddHolding checkpoint={checkpoint} />
      {currencies.length > 0 && (
        <section className="stack" aria-labelledby="fx-title">
          <h3 id="fx-title">{t.fxTitle}</h3>
          <p className="hint">{t.fxDetail}</p>
          <div className="grid-2">
            {currencies.map((c) => {
              const last = previous?.prices.fx[c];
              return (
                <AmountInput
                  key={`${checkpoint.id}-fx-${c}`}
                  id={`fx-${c}`}
                  label={t.fxLabel(c, base)}
                  value={checkpoint.prices.fx[c]}
                  {...(last ? { hint: t.lastYear(last) } : {})}
                  onCommit={(v) => {
                    update((p) =>
                      updateCheckpoint(p, checkpoint.id, (x) => {
                        return { ...x, prices: { ...x.prices, fx: withKey(x.prices.fx, c, v) } };
                      }),
                    );
                  }}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
