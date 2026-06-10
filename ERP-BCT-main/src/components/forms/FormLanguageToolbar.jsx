"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight, Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useFormLanguage } from "@/components/forms/FormLanguageContext"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LANGUAGE_FLAGS } from "@/lib/multilingual"
import { cn } from "@/lib/utils"

export default function FormLanguageToolbar({ className }) {
  const { t } = useTranslation("common")
  const formLanguage = useFormLanguage()

  if (!formLanguage) {
    return null
  }

  const { activeLanguage, setActiveLanguage, languages, activeIndex } = formLanguage
  const total = languages.length

  const prevLanguage = useMemo(() => {
    if (total === 0) return activeLanguage
    const nextIndex = (activeIndex - 1 + total) % total
    return languages[nextIndex].code
  }, [activeIndex, languages, total, activeLanguage])

  const nextLanguage = useMemo(() => {
    if (total === 0) return activeLanguage
    const nextIndex = (activeIndex + 1) % total
    return languages[nextIndex].code
  }, [activeIndex, languages, total, activeLanguage])

  const activeLabel = languages.find((lang) => lang.code === activeLanguage)?.label || ""

  return (
    <div
      className={cn(
        "rounded-[16px] border border-[var(--border-default)] bg-[var(--surface)] px-6 py-4 shadow-[var(--surface-shadow)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
            <Globe className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("formLanguage.title")}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {t("formLanguage.currentEditing")}{" "}
              <span className="font-medium text-[var(--text-primary)]">{activeLabel || activeLanguage}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {languages.map((lang, index) => (
              <span
                key={lang.code}
                className={cn(
                  "h-2 w-2 rounded-full transition",
                  index === activeIndex ? "bg-[var(--primary)]" : "bg-[var(--border-default)]",
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2 py-1.5 shadow-sm">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full text-[var(--accent)] hover:bg-[var(--surface-hover)]"
              onClick={() => setActiveLanguage(prevLanguage)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Select value={activeLanguage} onValueChange={setActiveLanguage}>
              <SelectTrigger className="h-10 min-w-[140px] border-none bg-transparent px-2 text-sm font-medium text-[var(--text-primary)] shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center gap-2">
                      <span>{LANGUAGE_FLAGS[lang.code] || "🌐"}</span>
                      <span>{lang.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full text-[var(--accent)] hover:bg-[var(--surface-hover)]"
              onClick={() => setActiveLanguage(nextLanguage)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
