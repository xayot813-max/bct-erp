export const SUPPORTED_LANGUAGES = ["ru", "en", "uz"];

export function normalizeLanguage(value) {
  if (!value || typeof value !== "string") return "ru";
  const normalized = value.toLowerCase().split("-")[0].trim();
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : "ru";
}
