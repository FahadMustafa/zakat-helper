import { Fragment } from 'react';
import { useT } from '../i18n/locale';

export type Step = 'prices' | 'holdings' | 'review';
const ORDER: Step[] = ['prices', 'holdings', 'review'];

export function Steps({ current }: { current: Step }) {
  const t = useT().checkpoint.steps;
  const at = ORDER.indexOf(current);
  return (
    <ol className="steps">
      {ORDER.map((s, i) => (
        <Fragment key={s}>
          {i > 0 && <li className="sep" aria-hidden="true" />}
          <li className={i < at ? 'done' : undefined} aria-current={i === at ? 'step' : undefined}>
            <b>{i + 1}</b>
            <span>{t[s]}</span>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
