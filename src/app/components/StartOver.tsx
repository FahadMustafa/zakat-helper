import { useState } from 'react';
import { useT } from '../i18n/locale';
import { useSession } from '../storage/sessionContext';
import { Confirm } from './Confirm';

/** "Start over" with a confirmation: clears the browser's copy, never the user's files. */
export function StartOver() {
  const t = useT().error;
  const { startOver } = useSession();
  const [asking, setAsking] = useState(false);
  return (
    <>
      <button
        className="btn quiet"
        type="button"
        onClick={() => {
          setAsking(true);
        }}
      >
        {t.startOver}
      </button>
      {asking && (
        <Confirm
          title={t.startOverTitle}
          confirmLabel={t.startOverConfirm}
          onCancel={() => {
            setAsking(false);
          }}
          onConfirm={() => {
            setAsking(false);
            void startOver();
          }}
        >
          <p>{t.startOverBody}</p>
        </Confirm>
      )}
    </>
  );
}
