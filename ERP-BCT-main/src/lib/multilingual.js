export const LANGUAGES = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "ru", label: "Русский", shortLabel: "RU" },
  { code: "uz", label: "O'zbekcha", shortLabel: "UZ" },
]

export const LANGUAGE_FLAGS = {
  en: "🇺🇸",
  ru: "🇷🇺",
  uz: "🇺🇿",
}

const EMPTY_VALUE = ""

export const defaultMultilingualValue = () =>
  LANGUAGES.reduce(
    (acc, lang) => {
      acc[lang.code] = EMPTY_VALUE
      return acc
    },
    {},
  )

export function parseMultilingual(value) {
  if (!value || typeof value !== "string") {
    return defaultMultilingualValue()
  }

  const parts = value.split("***")
  const base = defaultMultilingualValue()

  return LANGUAGES.reduce((acc, lang, index) => {
    const part = parts[index]
    if (part !== undefined) {
      acc[lang.code] = part
    } else if (parts.length === 1 && parts[0] !== undefined) {
      acc[lang.code] = parts[0]
    }
    return acc
  }, base)
}

export function sanitizeMultilingual(value) {
  if (!value) return defaultMultilingualValue()

  return LANGUAGES.reduce((acc, lang) => {
    const raw = value[lang.code]
    acc[lang.code] = typeof raw === "string" ? raw.trim() : EMPTY_VALUE
    return acc
  }, defaultMultilingualValue())
}

export function stringifyMultilingual(value) {
  const sanitized = sanitizeMultilingual(value)
  return LANGUAGES.map((lang) => sanitized[lang.code] || EMPTY_VALUE).join("***")
}

export function hasMultilingualContent(value) {
  const sanitized = sanitizeMultilingual(value)
  return LANGUAGES.some((lang) => sanitized[lang.code])
}

export function getLocalizedValue(value, language = "ru") {
  if (!value) return ""

  const parsed = typeof value === "string" ? parseMultilingual(value) : value
  const normalized = sanitizeMultilingual(parsed)

  if (normalized[language]) return normalized[language]

  for (const lang of LANGUAGES) {
    if (normalized[lang.code]) {
      return normalized[lang.code]
    }
  }

  return ""
}
