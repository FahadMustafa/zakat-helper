import { useT } from './i18n/locale';
import { useSession } from './storage/sessionContext';

export function Notices() {
  const t = useT().common;
  const { notice, dismissNotice } = useSession();
  if (!notice) return null;
  let body;
  switch (notice.kind) {
    case 'change-refused':
      body = (
        <>
          <span>{t.changeRefused}</span>
          <ul className="issues">
            {notice.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </>
      );
      break;
    case 'save-fallback':
      body = <span>{t.saveFallback}</span>;
      break;
    case 'copy-failed':
      body = <span>{t.copyFailed}</span>;
  }
  return (
    <div className="note warn-note stack" role="alert">
      {body}
      <div className="actions">
        <button className="btn small quiet" type="button" onClick={dismissNotice}>
          {t.dismiss}
        </button>
      </div>
    </div>
  );
}
