// components/LanguageSwitcher.jsx
'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import { normalizeLanguage } from '@/lib/i18n-utils';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);

  const languages = useMemo(() => [
    { code: 'ru', name: t('language.ru'), flag: '🇷🇺' },
    { code: 'en', name: t('language.en'), flag: '🇺🇸' },
    { code: 'uz', name: t('language.uz'), flag: '🇺🇿' },
  ], [t]);

  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const changeLanguage = async (langCode) => {
    const nextLanguage = normalizeLanguage(langCode);
    await i18n.changeLanguage(nextLanguage);
    if (typeof window !== "undefined") {
      localStorage.setItem('i18nextLng', nextLanguage);
      document.cookie = `i18nextLng=${encodeURIComponent(nextLanguage)}; path=/; max-age=2592000; samesite=lax`;
      document.documentElement.lang = nextLanguage;
    }
    setOpen(false);
  };

  return (
    <div className="relative w-auto">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 cursor-pointer items-center gap-2.5 rounded-[10px] border border-[var(--header-border)] bg-[var(--header-surface)] px-3.5 text-[var(--header-text)] shadow-none transition-colors duration-200 hover:bg-[var(--header-surface-hover)]"
      >
        <Globe className="h-4 w-4 text-[var(--header-text)]" />
        <span className="text-[18px] leading-none">
          {languages.find(lang => lang.code === currentLanguage)?.flag || '🌐'}
        </span>
      </button>
      
      <div className={`${open ? "visible opacity-100" : "invisible opacity-0"} absolute right-0 top-full z-50 mt-2 w-44 rounded-[12px] border border-[var(--header-border)] bg-[var(--header-bg)] p-2 shadow-[0_18px_40px_rgba(15,23,42,0.24)] transition-all duration-200`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => changeLanguage(lang.code)}
            className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-left transition-colors ${
              currentLanguage === lang.code ? 'bg-[var(--header-surface)] text-[var(--header-text)]' : 'text-[var(--header-muted)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-[18px] leading-none">{lang.flag}</span>
              <span className="text-[13px] font-medium">{lang.name}</span>
            </span>
            {currentLanguage === lang.code ? <Check className="h-4 w-4" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
