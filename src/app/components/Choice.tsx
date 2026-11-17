import type { ReactNode } from 'react';

export type Option<V extends string> = { value: V; label: string; detail?: string };

/** A labelled radio group with a one-line explanation per option and optional sources. */
export function Choice<V extends string>({
  name,
  title,
  options,
  value,
  onChange,
  footer,
}: {
  name: string;
  title: string;
  options: readonly Option<V>[];
  value: V;
  onChange: (v: V) => void;
  footer?: ReactNode;
}) {
  return (
    <fieldset className="setting">
      <legend>
        <h3>{title}</h3>
      </legend>
      <div className="choice">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name={name}
              id={`${name}-${o.value}`}
              checked={value === o.value}
              onChange={() => {
                onChange(o.value);
              }}
            />
            <span>
              <span>{o.label}</span>
              {o.detail && <small>{o.detail}</small>}
            </span>
          </label>
        ))}
      </div>
      {footer}
    </fieldset>
  );
}
