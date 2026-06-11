import { currencyReferenceOptions } from "@/lib/reference-data"

const coerceNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value === null || value === undefined) {
    return 0
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const normalizeCurrencyCode = (value: unknown): string => {
  const code = typeof value === "string" ? value.trim().toUpperCase() : ""
  return currencyReferenceOptions.some((item) => item.id === code) ? code : "UZS"
}

export const getCurrencyOption = (value: unknown) => {
  const code = normalizeCurrencyCode(value)
  return currencyReferenceOptions.find((item) => item.id === code) || currencyReferenceOptions[0]
}

export const formatMoney = (
  value: unknown,
  currency: unknown = "UZS",
  locale: string = "ru-RU",
  options: Intl.NumberFormatOptions = {},
): string => {
  const amount = coerceNumber(value)
  const option = getCurrencyOption(currency)
  const fractionDigits = option.id === "UZS" ? 0 : 2
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    ...options,
  }).format(amount)

  return `${formatted} ${option.symbol || option.label}`
}

export const resolveLocale = (language: unknown): string => {
  const normalized = typeof language === "string" ? language.toLowerCase() : ""
  if (normalized.startsWith("en")) return "en-US"
  if (normalized.startsWith("uz")) return "uz-UZ"
  return "ru-RU"
}

export const formatUSD = (value: unknown): string => {
  return formatMoney(value, "USD", "en-US")
}
