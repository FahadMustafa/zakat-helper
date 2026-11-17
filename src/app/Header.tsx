import { Mark } from './components/Mark';
import { useT } from './i18n/locale';
import { useOpenProfile } from './storage/sessionContext';

export function Header({ onHome, onSettings }: { onHome: () => void; onSettings: () => void }) {
  const t = useT();
  const { dirty, fileName, save, openFromDisk } = useOpenProfile();
  const status = dirty
    ? fileName
      ? t.common.unsaved(fileName)
      : t.common.unsavedNew
    : fileName
      ? t.common.saved(fileName)
      : t.common.unsavedNew;
  return (
    <header className="app-head">
      <button type="button" className="brand plain" onClick={onHome}>
        <Mark />
        <span className="brand-name">{t.appName}</span>
      </button>
      <div className="file">
        {dirty && <span className="dot" aria-hidden="true" />}
        <span role="status">{status}</span>
        <button className="btn small" type="button" onClick={() => void save()}>
          {t.common.save}
        </button>
        <button className="btn small quiet" type="button" onClick={() => void openFromDisk()}>
          {t.common.openFile}
        </button>
        <button className="btn small quiet" type="button" onClick={onSettings}>
          {t.common.settings}
        </button>
      </div>
    </header>
  );
}
