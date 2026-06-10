"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { LANGUAGES } from "@/lib/multilingual"
import { normalizeLanguage } from "@/lib/i18n-utils"

export const FormLanguageContext = createContext(null)
FormLanguageContext.displayName = "FormLanguageContext"

export function FormLanguageProvider({ initialLanguage, children }) {
  const { i18n } = useTranslation("common")
  const defaultLanguage =
    LANGUAGES.find((lang) => lang.code === normalizeLanguage(initialLanguage))?.code ?? LANGUAGES[0].code

  const [activeLanguage, setActiveLanguage] = useState(defaultLanguage)

  const changeActiveLanguage = async (language) => {
    const nextLanguage =
      LANGUAGES.find((lang) => lang.code === normalizeLanguage(language))?.code ?? LANGUAGES[0].code

    setActiveLanguage(nextLanguage)
    if (i18n.language !== nextLanguage) {
      await i18n.changeLanguage(nextLanguage)
    }
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
    [activeLanguage, i18n.language],
  )

  return (
    <FormLanguageContext.Provider value={value}>{children}</FormLanguageContext.Provider>
  )
}

export function useFormLanguage() {
  return useContext(FormLanguageContext)
}
