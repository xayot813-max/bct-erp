"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

import { LANGUAGES } from "@/lib/multilingual"
import { normalizeLanguage } from "@/lib/i18n-utils"

export const FormLanguageContext = createContext(null)
FormLanguageContext.displayName = "FormLanguageContext"

export function FormLanguageProvider({ initialLanguage, children }) {
  const defaultLanguage =
    LANGUAGES.find((lang) => lang.code === normalizeLanguage(initialLanguage))?.code ?? LANGUAGES[0].code

  const [activeLanguage, setActiveLanguage] = useState(defaultLanguage)

  const changeActiveLanguage = (language) => {
    const nextLanguage =
      LANGUAGES.find((lang) => lang.code === normalizeLanguage(language))?.code ?? LANGUAGES[0].code

    setActiveLanguage(nextLanguage)
  }

  useEffect(() => {
    const nextLanguage =
      LANGUAGES.find((lang) => lang.code === normalizeLanguage(initialLanguage))?.code ?? LANGUAGES[0].code
    setActiveLanguage((current) => (current === nextLanguage ? current : nextLanguage))
  }, [initialLanguage])

  const value = useMemo(
    () => ({
      activeLanguage,
      setActiveLanguage: changeActiveLanguage,
      languages: LANGUAGES,
      activeIndex: LANGUAGES.findIndex((lang) => lang.code === activeLanguage),
    }),
    [activeLanguage],
  )

  return (
    <FormLanguageContext.Provider value={value}>{children}</FormLanguageContext.Provider>
  )
}

export function useFormLanguage() {
  return useContext(FormLanguageContext)
}
