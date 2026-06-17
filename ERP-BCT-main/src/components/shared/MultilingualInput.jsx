"use client"

import { useContext, useEffect, useMemo, useState } from "react"

import { FormLanguageContext } from "@/components/forms/FormLanguageContext"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LANGUAGES, defaultMultilingualValue } from "@/lib/multilingual"
import { cn } from "@/lib/utils"

export default function MultilingualInput({
  value,
  onChange,
  type = "input",
  placeholder,
  disabled = false,
  className,
  hideLanguageSwitcher = false,
  activeLanguage,
  onLanguageChange,
}) {
  const formLanguage = useContext(FormLanguageContext)

  const defaultLanguage = useMemo(
    () => LANGUAGES.find((lang) => lang.code === "ru")?.code ?? LANGUAGES[0].code,
    [],
  )
  const [internalLang, setInternalLang] = useState(
    activeLanguage || formLanguage?.activeLanguage || defaultLanguage,
  )

  useEffect(() => {
    if (activeLanguage && activeLanguage !== internalLang) {
      setInternalLang(activeLanguage)
    }
  }, [activeLanguage, internalLang])

  useEffect(() => {
    if (formLanguage?.activeLanguage && formLanguage.activeLanguage !== internalLang) {
      setInternalLang(formLanguage.activeLanguage)
    }
  }, [formLanguage?.activeLanguage, internalLang])

  const currentLang = activeLanguage || formLanguage?.activeLanguage || internalLang
  const currentValue = value?.[currentLang] ?? defaultMultilingualValue()[currentLang]

  const handleChange = (nextValue) => {
    const updated = {
      ...defaultMultilingualValue(),
      ...value,
      [currentLang]: nextValue,
    }
    onChange?.(updated)
  }

  const handleLanguageSwitch = (lang) => {
    if (disabled) return
    onLanguageChange?.(lang)
    if (formLanguage?.setActiveLanguage) {
      formLanguage.setActiveLanguage(lang)
    } else if (!activeLanguage) {
      setInternalLang(lang)
    }
  }

  const renderControl = () => {
    if (type === "textarea") {
      return (
        <Textarea
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("min-h-[120px]", className)}
        />
      )
    }

    return (
      <Input
        value={currentValue}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
    )
  }

  const showLanguageSwitcher = !hideLanguageSwitcher && !formLanguage

  return (
    <div className={cn("space-y-3", !showLanguageSwitcher && "space-y-0")}>
      {showLanguageSwitcher && (
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1",
            disabled && "opacity-70",
          )}
        >
          {LANGUAGES.map((lang) => {
            const isActive = currentLang === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageSwitch(lang.code)}
                className={cn(
                  "min-w-[40px] rounded-full px-3 py-1 text-sm font-medium transition",
                  isActive
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface)]",
                  disabled && "cursor-not-allowed",
                )}
                disabled={disabled}
              >
                {lang.shortLabel}
              </button>
            )
          })}
        </div>
      )}

      {renderControl()}
    </div>
  )
}
