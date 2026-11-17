import { useState } from 'react';
import { useT } from '../i18n/locale';
import { useOpenProfile } from '../storage/sessionContext';

const MIN_LENGTH = 8;

/** Set, change or remove the passphrase, with a plain warning before turning it on. */
export function Passphrase() {
  const t = useT().passphrase;
  const common = useT().common;
  const { encrypted, setPassphrase } = useOpenProfile();
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (first.length < MIN_LENGTH) {
      setError(t.tooShort);
      return;
    }
    if (first !== second) {
      setError(t.mismatch);
      return;
    }
    setBusy(true);
    await setPassphrase(first);
    setBusy(false);
    setEditing(false);
    setFirst('');
    setSecond('');
    setError(null);
    setNotice(t.applied);
  };

  return (
    <section className="setting" aria-labelledby="passphrase-title">
      <h3 id="passphrase-title">{t.title}</h3>
      <p>{encrypted ? t.on : t.off}</p>
      {notice && <p className="note">{notice}</p>}
      {editing ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void apply();
          }}
        >
          <p className="note warn-note">{t.warning}</p>
          <div className="field">
            <label htmlFor="pp1">{t.newField}</label>
            <input
              id="pp1"
              type="password"
              autoComplete="new-password"
              value={first}
              onChange={(e) => {
                setFirst(e.target.value);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="pp2">{t.confirm}</label>
            <input
              id="pp2"
              type="password"
              autoComplete="new-password"
              value={second}
              onChange={(e) => {
                setSecond(e.target.value);
              }}
            />
          </div>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button className="btn" type="submit" disabled={busy}>
              {t.apply}
            </button>
            <button
              className="btn quiet"
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              {common.cancel}
            </button>
          </div>
        </form>
      ) : (
        <div className="actions">
          <button
            className="btn quiet"
            type="button"
            onClick={() => {
              setEditing(true);
              setNotice(null);
            }}
          >
            {encrypted ? t.change : t.set}
          </button>
          {encrypted && (
            <button
              className="btn quiet"
              type="button"
              onClick={() => {
                void setPassphrase(null).then(() => {
                  setNotice(t.removed);
                });
              }}
            >
              {t.remove}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
