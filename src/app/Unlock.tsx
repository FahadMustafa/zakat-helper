import { useState } from 'react';
import { Mark } from './components/Mark';
import { StartOver } from './components/StartOver';
import { useT } from './i18n/locale';
import { useSession } from './storage/sessionContext';

export function Unlock({ error }: { error?: 'wrong-passphrase' }) {
  const t = useT();
  const { unlock, openFromDisk } = useSession();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="screen welcome">
      <div className="brand">
        <Mark />
        <span className="brand-name">{t.appName}</span>
      </div>
      <h1>{t.unlock.title}</h1>
      <p>{t.unlock.intro}</p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void unlock(value).finally(() => {
            setBusy(false);
          });
        }}
      >
        <div className="field">
          <label htmlFor="unlock-pp">{t.passphrase.field}</label>
          <input
            id="unlock-pp"
            type="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
        </div>
        {error && (
          <p className="error-text" role="alert">
            {t.unlock.wrong}
          </p>
        )}
        <div className="actions">
          <button className="btn" type="submit" disabled={busy || value.length === 0}>
            {t.unlock.button}
          </button>
          <button className="btn quiet" type="button" onClick={() => void openFromDisk()}>
            {t.unlock.openOther}
          </button>
          <StartOver />
        </div>
      </form>
    </main>
  );
}
