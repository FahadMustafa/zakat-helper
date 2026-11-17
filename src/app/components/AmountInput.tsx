import { useState } from 'react';
import { useT } from '../i18n/locale';
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
}: {
  id: string;
  label: string;
  value: string | undefined;
  onCommit: (v: string | undefined) => void;
  hint?: string;
  hideLabel?: boolean;
}) {
  const t = useT();
  const [text, setText] = useState(value ?? '');
  const [invalid, setInvalid] = useState(false);
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
            setInvalid(false);
            onCommit(undefined);
            return;
          }
          const r = parseAmountInput(next);
          setInvalid(!r.ok);
          if (r.ok) onCommit(r.value);
        }}
      />
      {hint && !invalid && <small className="hint">{hint}</small>}
      {invalid && (
        <small id={errorId} className="error-text">
          {t.checkpoint.invalidAmount}
        </small>
      )}
    </div>
  );
}
