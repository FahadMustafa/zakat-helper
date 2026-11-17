import { useState } from 'react';
import { useT } from '../i18n/locale';
import { Dec } from '../../engine/money';
import { parseAmountInput } from '../numbers';

/**
 * A text field for an amount. Accepts Western or Arabic digits; commits only well-formed values and
 * says plainly what is wrong otherwise. `value` undefined means not entered yet.
 */
export function AmountInput({
  id,
  label,
  value,
  onCommit,
  hint,
  hideLabel = false,
  max,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onCommit: (v: string | undefined) => void;
  hint?: string;
  hideLabel?: boolean;
  /** Inclusive upper bound, as a decimal string. */
  max?: string;
}) {
  const t = useT();
  const [text, setText] = useState(value ?? '');
  const [problem, setProblem] = useState<'format' | 'range' | null>(null);
  const [readAs, setReadAs] = useState<string | null>(null);
  const invalid = problem !== null;
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className="right num"
        value={text}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (next.trim() === '') {
            setProblem(null);
            setReadAs(null);
            onCommit(undefined);
            return;
          }
          const r = parseAmountInput(next);
          if (!r.ok) {
            setProblem('format');
            setReadAs(null);
            return;
          }
          if (max !== undefined && Dec.parse(r.value).cmp(Dec.parse(max)) > 0) {
            setProblem('range');
            setReadAs(null);
            return;
          }
          setProblem(null);
          // Echo how a grouped or non-Western number was read, so 15.000 meaning fifteen thousand is caught.
          setReadAs(/^[\d.]+$/.test(next.trim()) ? null : r.value);
          onCommit(r.value);
        }}
      />
      {hint && !invalid && <small className="hint">{hint}</small>}
      {readAs !== null && <small className="hint">{t.checkpoint.readAs(readAs)}</small>}
      {invalid && (
        <small id={errorId} className="error-text">
          {problem === 'range' ? t.checkpoint.outOfRange : t.checkpoint.invalidAmount}
        </small>
      )}
    </div>
  );
}
