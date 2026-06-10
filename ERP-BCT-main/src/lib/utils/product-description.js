import { defaultMultilingualValue, parseMultilingual, stringifyMultilingual } from "@/lib/multilingual"

const DEFAULT_COLUMNS = [
  {
    id: "col_param",
    label: stringifyMultilingual({
      en: "Parameter",
      ru: "Параметр",
      uz: "Parametr",
    }),
  },
  {
    id: "col_value",
    label: stringifyMultilingual({
      en: "Value",
      ru: "Значение",
      uz: "Qiymat",
    }),
  },
]

const LEGACY_DEFAULT_LABELS = {
  parameter: {
    en: "Parameter",
    ru: "Параметр",
    uz: "Parametr",
  },
  value: {
    en: "Value",
    ru: "Значение",
    uz: "Qiymat",
  },
}

const normalizeLegacyDefaultLabel = (value) => {
  const normalizedValues = Object.values(value || {})
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().toLowerCase())

  if (normalizedValues.length === 0) return value

  const allParameter = normalizedValues.every((item) => item === "parameter")
  if (allParameter) {
    return { ...value, ...LEGACY_DEFAULT_LABELS.parameter }
  }

  const allValue = normalizedValues.every((item) => item === "value")
  if (allValue) {
    return { ...value, ...LEGACY_DEFAULT_LABELS.value }
  }

  return value
}

const ensureMultilingualObject = (value) => {
  const base = defaultMultilingualValue()
  if (!value) return base
  if (typeof value === "string") {
    const parsed = parseMultilingual(value)
    return normalizeLegacyDefaultLabel({ ...base, ...parsed })
  }
  if (typeof value === "object") {
    return normalizeLegacyDefaultLabel({ ...base, ...value })
  }
  return base
}

export const parseDescriptionState = (rawValue) => {
  if (!rawValue) {
    return {
      columns: DEFAULT_COLUMNS.map((column) => ({
        ...column,
        labelValue: ensureMultilingualObject(column.label),
      })),
      rows: [],
    }
  }

  let parsed
  if (typeof rawValue === "string") {
    try {
      parsed = JSON.parse(rawValue)
    } catch {
      parsed = null
    }
  } else if (typeof rawValue === "object") {
    parsed = rawValue
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      columns: DEFAULT_COLUMNS.map((column) => ({
        ...column,
        labelValue: ensureMultilingualObject(column.label),
      })),
      rows: [],
    }
  }

  const columns = (parsed.columns || DEFAULT_COLUMNS).map((column, index) => {
    const id = column?.id || `col_${index}`
    const labelValue = ensureMultilingualObject(column?.label)
    return {
      id,
      label: stringifyMultilingual(labelValue),
      labelValue,
    }
  })

  const rows = Array.isArray(parsed.rows)
    ? parsed.rows.map((row, rowIndex) => {
        const cells = {}
        columns.forEach((column) => {
          const rawCell = row?.[column.id]
          cells[column.id] = ensureMultilingualObject(rawCell)
        })
        return {
          id: row?.id || `row_${rowIndex}`,
          cells,
        }
      })
    : []

  return { columns, rows }
}

export const serializeDescriptionState = (state) => {
  const columns = state.columns.map((column) => ({
    id: column.id,
    label: stringifyMultilingual(column.labelValue || {}),
  }))

  const rows = state.rows.map((row) => {
    const serializedRow = {}
    Object.entries(row.cells || {}).forEach(([columnId, value]) => {
      serializedRow[columnId] = stringifyMultilingual(value || {})
    })
    return serializedRow
  })

  return JSON.stringify({ columns, rows })
}

export const createEmptyRow = (columns, index = 0) => {
  const cells = {}
  columns.forEach((column) => {
    cells[column.id] = defaultMultilingualValue()
  })
  return {
    id: `row_${Date.now()}_${index}`,
    cells,
  }
}

export const createEmptyColumn = (index = 0) => {
  const labelValue = defaultMultilingualValue()
  return {
    id: `col_${Date.now()}_${index}`,
    label: stringifyMultilingual(labelValue),
    labelValue,
  }
}
