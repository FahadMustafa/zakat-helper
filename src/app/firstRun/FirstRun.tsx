import { useState } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '../../engine/schema';
import { Mark } from '../components/Mark';
import type { Locale } from '../dates';
import { useT } from '../i18n/locale';
import { LanguageSwitch } from '../settings/LanguageSwitch';
import { SettingsForm } from '../settings/SettingsForm';
import { useSession } from '../storage/sessionContext';

export function FirstRun({ locale, onLocale }: { locale: Locale; onLocale: (l: Locale) => void }) {
  const t = useT();
  const { startNew, openFromDisk } = useSession();
  const [step, setStep] = useState<'welcome' | 'setup'>('welcome');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  if (step === 'setup') {
    return (
      <main className="screen">
        <h1>{t.firstRun.setupTitle}</h1>
        <p>{t.firstRun.setupIntro}</p>
        <SettingsForm value={{ ...settings, locale }} onChange={setSettings} />
        <div className="actions">
          <button
            className="btn quiet"
            type="button"
            onClick={() => {
              setStep('welcome');
            }}
          >
            {t.common.back}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              startNew({ ...settings, locale });
            }}
          >
            {t.firstRun.start}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen welcome">
      <div className="brand">
        <Mark />
        <span className="brand-name">{t.appName}</span>
      </div>
      <LanguageSwitch value={locale} onChange={onLocale} />
      <h1>{t.firstRun.title}</h1>
      <p>{t.firstRun.intro}</p>
      <div className="actions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            setStep('setup');
          }}
        >
          {t.firstRun.startNew}
        </button>
        <button className="btn quiet" type="button" onClick={() => void openFromDisk()}>
          {t.firstRun.open}
        </button>
      </div>
      <p className="note">{t.notAFatwa}</p>
    </main>
  );
}
