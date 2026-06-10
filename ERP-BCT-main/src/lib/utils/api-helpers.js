import { API_BASE_ORIGIN } from "@/lib/api-client"

const normalizeBase = (value) => {
  if (!value || typeof value !== "string") return ""
  return value.replace(/\/+$/, "")
}

const PUBLIC_IMAGE_BASE =
  normalizeBase(process.env.NEXT_PUBLIC_IMG_URL) ||
  normalizeBase(API_BASE_ORIGIN)

/**
 * Client-side helper functions for API data
 * These are NOT server actions, just utility functions
 */

/**
 * Get full URL for an uploaded file
 * @param {string} path - File path (e.g., "/uploads/filename.jpg")
 * @returns {string}
 */
export function getFileUrl(path) {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const base = PUBLIC_IMAGE_BASE || API_BASE_ORIGIN.replace(/\/$/, "")
  return `${base}${normalizedPath}`
}

/**
 * Helper function to build image URLs from API responses
 * @param {string|Array} images - Image path or array of image objects
 * @returns {Array<{url: string, preview: string, path?: string, id: string}>}
 */
export function buildImageUrls(images) {
  if (!images) return []

  if (typeof images === 'string') {
    return [{
      id: '1',
      url: getFileUrl(images),
      preview: getFileUrl(images),
      path: images,
    }]
  }

  if (Array.isArray(images)) {
    return images.map((img, index) => ({
      id: img.id || `${index + 1}`,
      url: typeof img === 'string' ? getFileUrl(img) : getFileUrl(img.url),
      preview: typeof img === 'string' ? getFileUrl(img) : getFileUrl(img.url),
      path: typeof img === 'string' ? img : img.url,
      name: img.name || `Image ${index + 1}`,
    }))
  }

  return []
}

const RESPONSE_ARRAY_KEYS = [
  "data",
  "items",
  "results",
  "rows",
  "list",
  "entries",
  "values",
  "elements",
  "records",
  "clients",
  "companies",
  "counterparties",
  "contracts",
  "products",
  "categories",
  "top_categories",
  "funnels",
]

/**
 * Attempt to extract an array payload from a REST response object.
 * Falls back to traversing known keys commonly used for collections.
 */
export function extractArrayFromResponse(payload, extraKeys = []) {
  const visited = new WeakSet()

  const traverse = (value) => {
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value !== "object") return []
    if (visited.has(value)) return []

    visited.add(value)
    const record = value
    const keys = [...new Set([...extraKeys, ...RESPONSE_ARRAY_KEYS])]

    for (const key of keys) {
      const candidate = record[key]
      if (!candidate) continue

      if (Array.isArray(candidate)) {
        return candidate
      }

      if (typeof candidate === "object") {
        const nested = traverse(candidate)
        if (nested.length > 0) {
          return nested
        }
      }
    }

    return []
  }

  return traverse(payload)
}

/**
 * Try to resolve an identifier from common id fields.
 */
export function resolveRecordId(value) {
  if (value === null || value === undefined) return undefined
  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim()
    return normalized.length > 0 ? normalized : undefined
  }

  if (typeof value === "object") {
    const record = value
    const candidate =
      record.id ??
      record._id ??
      record.uuid ??
      record.guid ??
      record.ID ??
      record.Id ??
      record.code ??
      record.value ??
      record.key ??
      record.slug ??
      record.category_id ??
      record.top_category_id

    if (candidate !== undefined && candidate !== null) {
      const normalized = String(candidate).trim()
      if (normalized.length > 0) {
        return normalized
      }
    }
  }

  return undefined
}

/**
 * Normalize an arbitrary API entity into a select option structure.
 */
export function toSelectOption(item, index = 0, fallbackLabel = "") {
  if (item === null || item === undefined) return null

  if (typeof item === "string" || typeof item === "number") {
    const id = String(item).trim()
    if (!id) return null
    const stringFallback =
      typeof fallbackLabel === "string" && fallbackLabel.trim().length > 0
        ? fallbackLabel
        : `Option ${index + 1}`
    const label = stringFallback || id || `Option ${index + 1}`
    return {
      id,
      name: id,
      displayName: label,
      raw: { id, name: id },
    }
  }

  if (typeof item !== "object") return null

  const record = item
  const id = resolveRecordId(record)
  if (!id) return null

  const stringFallback =
    typeof fallbackLabel === "string" && fallbackLabel.trim().length > 0
      ? fallbackLabel
      : `Option ${index + 1}`

  const candidates = [
    record.name,
    record.title,
    record.label,
    record.category_name,
    record.top_category_name,
    record.description,
  ]

  const baseName =
    candidates.find((value) => {
      if (value === undefined || value === null) return false
      if (typeof value === "string") {
        return value.trim().length > 0
      }
      return true
    }) ?? fallbackLabel ?? stringFallback

  const displayName =
    typeof baseName === "string" && baseName.trim().length > 0
      ? baseName
      : stringFallback

  return {
    id: id.toString(),
    name: baseName,
    displayName,
    raw: record,
  }
}

/**
 * Ensure the currently selected option exists in the array.
 */
export function ensureOption(options = [], candidate, fallbackLabel = "") {
  const normalized = toSelectOption(candidate, options.length, fallbackLabel)
  if (!normalized) return options
  if (options.some((option) => option?.id === normalized.id)) {
    return options
  }
  return [...options, normalized]
}
