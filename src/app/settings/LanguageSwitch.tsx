import type { Locale } from '../dates';
import { useT } from '../i18n/locale';

export function LanguageSwitch({
  value,
  onChange,
}: {
  value: Locale;
  onChange: (l: Locale) => void;
}) {
  const t = useT();
  return (
    <div className="lang" role="group" aria-label={t.settings.language}>
      {(['en', 'ar'] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={value === l}
          onClick={() => {
            onChange(l);
          }}
        >
          {l === 'en' ? 'English' : 'العربية'}
        </button>
      ))}
    </div>
  );
}
