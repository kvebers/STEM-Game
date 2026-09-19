import { useLanguageStore } from '../state/useLanguageStore.js';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
];

export function LanguageSwitcher() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={`lang-switch-btn ${language === code ? 'lang-switch-btn-active' : ''}`}
          onClick={() => setLanguage(code)}
          aria-pressed={language === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
