import { useT } from '../i18n/locale';

export function Home({ onStart }: { onStart: () => void }) {
  const t = useT();
  return (
    <main className="screen">
      <h1>{t.home.title}</h1>
      <p className="note">{t.home.empty}</p>
      <div className="actions">
        <button className="btn" type="button" onClick={onStart}>
          {t.home.start}
        </button>
      </div>
      <p className="hint">{t.common.privacy}</p>
    </main>
  );
}
