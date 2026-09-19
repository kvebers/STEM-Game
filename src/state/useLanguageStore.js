import { create } from 'zustand';

const STORAGE_KEY = 'elly-language';
export const SUPPORTED_LANGUAGES = ['en', 'fr'];

function detectInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.includes(stored)) return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.) - fall through to browser detection.
  }
  const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'en';
}

export const useLanguageStore = create((set) => ({
  language: detectInitialLanguage(),
  setLanguage: (language) => {
    if (!SUPPORTED_LANGUAGES.includes(language)) return;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore write failures, language just won't persist across reloads
    }
    set({ language });
  },
}));
