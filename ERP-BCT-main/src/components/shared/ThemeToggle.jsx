"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export default function ThemeToggle() {
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
        aria-label="Переключатель темы"
        title="Переключатель темы"
      >
        <Moon className="h-4 w-4 text-[var(--header-text)]" />
        <span className="text-[13px] font-medium">Dark</span>
      </button>
    )
  }

  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-10 items-center gap-2.5 rounded-[10px] border border-[var(--header-border)] bg-[var(--header-surface)] px-3.5 text-[var(--header-text)] shadow-none transition-colors duration-200 hover:bg-[var(--header-surface-hover)]"
      aria-label={isDark ? "Включить светлую тему" : "Включить темную тему"}
      title={isDark ? "Светлая тема" : "Темная тема"}
    >
      {isDark ? <Sun className="h-4 w-4 text-[var(--header-text)]" /> : <Moon className="h-4 w-4 text-[var(--header-text)]" />}
      <span className="text-[13px] font-medium text-[var(--header-text)]">{isDark ? "Light" : "Dark"}</span>
    </button>
  )
}
