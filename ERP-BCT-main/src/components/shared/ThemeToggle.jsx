"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"

export default function ThemeToggle() {
  const { t } = useTranslation("common")
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-10 items-center gap-2.5 rounded-[10px] border border-[var(--header-border)] bg-[var(--header-surface)] px-3.5 text-[var(--header-text)] shadow-none transition-colors duration-200"
        aria-label={t("themeToggle.switcher")}
        title={t("themeToggle.switcher")}
      >
        <Moon className="h-4 w-4 text-[var(--header-text)]" />
        <span className="text-[13px] font-medium">{t("themeToggle.dark")}</span>
      </button>
    )
  }

  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-10 items-center gap-2.5 rounded-[10px] border border-[var(--header-border)] bg-[var(--header-surface)] px-3.5 text-[var(--header-text)] shadow-none transition-colors duration-200 hover:bg-[var(--header-surface-hover)]"
      aria-label={isDark ? t("themeToggle.enableLight") : t("themeToggle.enableDark")}
      title={isDark ? t("themeToggle.light") : t("themeToggle.dark")}
    >
      {isDark ? <Sun className="h-4 w-4 text-[var(--header-text)]" /> : <Moon className="h-4 w-4 text-[var(--header-text)]" />}
      <span className="text-[13px] font-medium text-[var(--header-text)]">{isDark ? t("themeToggle.light") : t("themeToggle.dark")}</span>
    </button>
  )
}
