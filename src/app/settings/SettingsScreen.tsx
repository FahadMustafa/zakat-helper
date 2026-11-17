import { useT } from '../i18n/locale';
import { useOpenProfile } from '../storage/sessionContext';
import { LanguageSwitch } from './LanguageSwitch';
import { Passphrase } from './Passphrase';
import { SettingsForm } from './SettingsForm';

export function SettingsScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  const { profile, update } = useOpenProfile();
  return (
    <main className="screen">
      <h1>{t.settings.title}</h1>
      <div className="field">
        <span className="label">{t.settings.language}</span>
        <LanguageSwitch
          value={profile.settings.locale}
          onChange={(locale) => {
            update((p) => ({ ...p, settings: { ...p.settings, locale } }));
          }}
        />
      </div>
      <p>{t.settings.intro}</p>
      <p className="note">{t.settings.frozenNote}</p>
      <SettingsForm
        value={profile.settings}
        onChange={(settings) => {
          update((p) => ({ ...p, settings }));
        }}
      />
      <Passphrase />
      <div className="actions">
        <button className="btn" type="button" onClick={onDone}>
          {t.common.done}
        </button>
      </div>
    </main>
  );
}
