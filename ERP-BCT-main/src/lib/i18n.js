// lib/i18n.js

"use client"
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { normalizeLanguage, SUPPORTED_LANGUAGES } from '@/lib/i18n-utils';

// Translation files
import ru from '@/locales/ru/common.json';
import en from '@/locales/en/common.json';
import uz from '@/locales/uz/common.json';

const resources = {
  ru: {
    common: ru
  },
  en: {
    common: en
  },
  uz: {
    common: uz
  }
};

const getInitialLanguage = () => {
  if (typeof window === "undefined") {
    return "ru";
  }

  const htmlLanguage = document.documentElement.lang || "";
  const cookieMatch = document.cookie.match(/(?:^|; )i18nextLng=([^;]*)/);
  const cookieLanguage = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
  const storedLanguage = window.localStorage.getItem("i18nextLng") || "";

  // Keep the first client render aligned with SSR to avoid hydration mismatches.
  return normalizeLanguage(htmlLanguage || cookieLanguage || storedLanguage || "ru");
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    lng: getInitialLanguage(),
    supportedLngs: SUPPORTED_LANGUAGES,
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },

    ns: ['common'],
    defaultNS: 'common'
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    const normalized = normalizeLanguage(lng);
    localStorage.setItem('i18nextLng', normalized);
    document.cookie = `i18nextLng=${encodeURIComponent(normalized)}; path=/; max-age=2592000; samesite=lax`;
    document.documentElement.lang = normalized;
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language || 'ru');
}

export default i18n;
