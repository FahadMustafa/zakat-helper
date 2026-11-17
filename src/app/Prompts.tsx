import { useState } from 'react';
import { Modal } from './components/Modal';
import { useT } from './i18n/locale';
import { useSession } from './storage/sessionContext';

function FilePassphrase({ fileName, error }: { fileName: string; error?: 'wrong-passphrase' }) {
  const t = useT();
  const { submitFilePassphrase, dismissPrompt } = useSession();
  const [value, setValue] = useState('');
  return (
    <Modal title={t.prompts.passphraseTitle} onCancel={dismissPrompt}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submitFilePassphrase(value);
        }}
      >
        <p>{t.prompts.passphraseBody(fileName)}</p>
        <div className="field">
          <label htmlFor="file-pp">{t.passphrase.field}</label>
          <input
            id="file-pp"
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
          <button className="btn" type="submit" disabled={value.length === 0}>
            {t.prompts.open}
          </button>
          <button className="btn quiet" type="button" onClick={dismissPrompt}>
            {t.common.cancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Prompts() {
  const t = useT();
  const { prompt, resolveConflict, dismissPrompt } = useSession();
  if (!prompt) return null;
  switch (prompt.kind) {
    case 'file-passphrase':
      return (
        <FilePassphrase
          fileName={prompt.fileName}
          {...(prompt.error ? { error: prompt.error } : {})}
        />
      );
    case 'conflict':
      return (
        <Modal
          title={t.prompts.conflictTitle}
          onCancel={() => {
            resolveConflict('browser');
          }}
        >
          <p>
            {prompt.reason === 'file-older'
              ? t.prompts.conflictOlder(prompt.fileName)
              : t.prompts.conflictUnsaved(prompt.fileName)}
          </p>
          <div className="actions">
            <button
              className="btn"
              type="button"
              onClick={() => {
                resolveConflict('browser');
              }}
            >
              {t.prompts.keepBrowser}
            </button>
            <button
              className="btn quiet"
              type="button"
              onClick={() => {
                resolveConflict('file');
              }}
            >
              {t.prompts.keepFile(prompt.fileName)}
            </button>
          </div>
        </Modal>
      );
    case 'file-problem':
      return (
        <Modal title={t.prompts.problemTitle(prompt.fileName)} onCancel={dismissPrompt}>
          <ul className="issues">
            {prompt.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <div className="actions">
            <button className="btn" type="button" onClick={dismissPrompt}>
              {t.common.ok}
            </button>
          </div>
        </Modal>
      );
  }
}
