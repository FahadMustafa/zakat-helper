import { useEffect, useState } from 'react';
import type { Locale } from './dates';
import { CheckpointFlow } from './checkpoint/CheckpointFlow';
import { startCheckpoint } from './checkpoint/draft';
import { Review } from './checkpoint/Review';
import { FirstRun } from './firstRun/FirstRun';
import { Header } from './Header';
import { Home } from './home/Home';
import { applyDocumentLocale } from './i18n';
import { LocaleContext, useT } from './i18n/locale';
import { Prompts } from './Prompts';
import { SettingsScreen } from './settings/SettingsScreen';
import { useOpenProfile, useSession } from './storage/sessionContext';
import { Unlock } from './Unlock';
import type { View } from './view';

function initialLocale(): Locale {
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

function ErrorScreen({ message }: { message: string }) {
  const t = useT();
  return (
    <main className="screen">
      <h1>{t.error.title}</h1>
      <p className="note warn-note">{message}</p>
      <div className="actions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            location.reload();
          }}
        >
          {t.error.reload}
        </button>
      </div>
    </main>
  );
}

function OpenApp() {
  const { profile, update } = useOpenProfile();
  const [view, setView] = useState<View>({ kind: 'home' });
  const home = () => {
    setView({ kind: 'home' });
  };
  const startYear = () => {
    const draft = profile.checkpoints.find((c) => c.status === 'draft');
    if (draft) {
      setView({ kind: 'checkpoint', checkpointId: draft.id });
      return;
    }
    const id = crypto.randomUUID();
    update((p) => startCheckpoint(p, id, new Date().toISOString().slice(0, 10)));
    setView({ kind: 'checkpoint', checkpointId: id });
  };
  let screen;
  switch (view.kind) {
    case 'home':
    case 'year':
      screen = <Home onStart={startYear} />;
      break;
    case 'checkpoint':
      screen = (
        <CheckpointFlow
          key={view.checkpointId}
          checkpointId={view.checkpointId}
          review={(nav) => (
            <Review
              checkpointId={view.checkpointId}
              {...nav}
              onFinished={() => {
                setView({ kind: 'year', checkpointId: view.checkpointId });
              }}
              onOpenCheckpoint={(checkpointId) => {
                setView({ kind: 'checkpoint', checkpointId });
              }}
            />
          )}
        />
      );
      break;
    case 'settings':
      screen = <SettingsScreen onDone={home} />;
  }
  return (
    <>
      <Header
        onHome={home}
        onSettings={() => {
          setView({ kind: 'settings' });
        }}
      />
      {screen}
    </>
  );
}

export function App() {
  const { session } = useSession();
  const [welcomeLocale, setWelcomeLocale] = useState<Locale>(initialLocale);
  const locale = session.kind === 'open' ? session.profile.settings.locale : welcomeLocale;

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  let body;
  switch (session.kind) {
    case 'loading':
      body = null;
      break;
    case 'welcome':
      body = <FirstRun locale={welcomeLocale} onLocale={setWelcomeLocale} />;
      break;
    case 'locked':
      body = <Unlock {...(session.error ? { error: session.error } : {})} />;
      break;
    case 'error':
      body = <ErrorScreen message={session.message} />;
      break;
    case 'open':
      body = <OpenApp />;
  }

  return (
    <LocaleContext value={locale}>
      <div className="wrap">{body}</div>
      <Prompts />
    </LocaleContext>
  );
}
