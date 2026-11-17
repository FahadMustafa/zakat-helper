import { useEffect, useState } from 'react';
import type { Locale } from './dates';
import { CheckpointFlow } from './checkpoint/CheckpointFlow';
import { startCheckpoint } from './checkpoint/draft';
import { Review } from './checkpoint/Review';
import { FirstRun } from './firstRun/FirstRun';
import { Header } from './Header';
import { Home } from './home/Home';
import { YearPage } from './home/YearPage';
import { applyDocumentLocale } from './i18n';
import { LocaleContext, useT } from './i18n/locale';
import { Prompts } from './Prompts';
import { SettingsScreen } from './settings/SettingsScreen';
import { useOpenProfile, useSession, type Session } from './storage/sessionContext';
import { StartOver } from './components/StartOver';
import { Notices } from './Notices';
import { Unlock } from './Unlock';
import type { View } from './view';

function initialLocale(): Locale {
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

function ErrorScreen({ failure }: { failure: Extract<Session, { kind: 'error' }> }) {
  const t = useT();
  const { openFromDisk, downloadBrowserCopy } = useSession();
  const headline =
    failure.reason === 'newer-version'
      ? t.error.newerVersion
      : failure.reason === 'unreadable'
        ? t.error.unreadable
        : t.error.title;
  return (
    <main className="screen">
      <h1>{t.error.title}</h1>
      <p className="note warn-note">{headline}</p>
      {failure.details && <pre className="hint issues">{failure.details}</pre>}
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
        <button className="btn quiet" type="button" onClick={() => void downloadBrowserCopy()}>
          {t.error.downloadCopy}
        </button>
        <button className="btn quiet" type="button" onClick={() => void openFromDisk()}>
          {t.error.openFile}
        </button>
        <StartOver />
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
      screen = (
        <Home
          onStart={startYear}
          onOpenYear={(checkpointId) => {
            setView({ kind: 'year', checkpointId });
          }}
        />
      );
      break;
    case 'year':
      screen = (
        <YearPage
          key={view.checkpointId}
          checkpointId={view.checkpointId}
          onDiscarded={home}
          onEdit={() => {
            setView({ kind: 'checkpoint', checkpointId: view.checkpointId });
          }}
        />
      );
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
      body = <ErrorScreen failure={session} />;
      break;
    case 'open':
      body = <OpenApp />;
  }

  return (
    <LocaleContext value={locale}>
      <div className="wrap">
        <Notices />
        {body}
      </div>
      <Prompts />
    </LocaleContext>
  );
}
