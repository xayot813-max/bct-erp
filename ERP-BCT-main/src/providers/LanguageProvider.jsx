// components/providers/LanguageProvider.jsx
'use client';

import i18n from '@/lib/i18n';
import { normalizeLanguage } from '@/lib/i18n-utils';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getPreferredLanguage(fallbackLanguage) {
  if (typeof window === "undefined") {
    return normalizeLanguage(fallbackLanguage);
  }

  return normalizeLanguage(
    readCookie('i18nextLng') ||
    localStorage.getItem('i18nextLng') ||
    document.documentElement.lang ||
    fallbackLanguage
  );
}

export default function LanguageProvider({ children, initialLanguage = "ru" }) {
  const normalizedInitialLanguage = normalizeLanguage(initialLanguage);

  if (normalizeLanguage(i18n.resolvedLanguage || i18n.language) !== normalizedInitialLanguage) {
    i18n.changeLanguage(normalizedInitialLanguage);
  }

  useEffect(() => {
    const storedLanguage = getPreferredLanguage(normalizedInitialLanguage);

    if (normalizeLanguage(i18n.resolvedLanguage || i18n.language) !== storedLanguage) {
      i18n.changeLanguage(storedLanguage);
    } else {
      document.documentElement.lang = storedLanguage;
      localStorage.setItem('i18nextLng', storedLanguage);
      document.cookie = `i18nextLng=${encodeURIComponent(storedLanguage)}; path=/; max-age=2592000; samesite=lax`;
    }
  }, [normalizedInitialLanguage]);

  useEffect(() => {
    const syncLanguage = () => {
      const nextLanguage = normalizeLanguage(
        readCookie('i18nextLng') ||
        localStorage.getItem('i18nextLng') ||
        i18n.resolvedLanguage ||
        i18n.language ||
        normalizedInitialLanguage
      );

      if (normalizeLanguage(i18n.resolvedLanguage || i18n.language) !== nextLanguage) {
        i18n.changeLanguage(nextLanguage);
      } else {
        document.documentElement.lang = nextLanguage;
      }
    };

    const handleStorage = (event) => {
      if (event.key && event.key !== 'i18nextLng') return;
      syncLanguage();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', syncLanguage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', syncLanguage);
    };
  }, [normalizedInitialLanguage]);

  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      const nextLanguage = normalizeLanguage(lng);
      document.documentElement.lang = nextLanguage;
      localStorage.setItem('i18nextLng', nextLanguage);
      document.cookie = `i18nextLng=${encodeURIComponent(nextLanguage)}; path=/; max-age=2592000; samesite=lax`;
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
