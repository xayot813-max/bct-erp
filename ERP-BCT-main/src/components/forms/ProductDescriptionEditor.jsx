"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ArrowUp, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useFormLanguage } from "@/components/forms/FormLanguageContext"
import MultilingualInput from "@/components/shared/MultilingualInput"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LANGUAGES, LANGUAGE_FLAGS, defaultMultilingualValue } from "@/lib/multilingual"
import {
  createEmptyColumn,
  createEmptyRow,
  parseDescriptionState,
  serializeDescriptionState,
} from "@/lib/utils/product-description"

export default function ProductDescriptionEditor({
  label,
  value,
  onChange,
  disabled = false,
}) {
  const { t } = useTranslation("common")
  const [table, setTable] = useState(() => parseDescriptionState(value))
  const formLanguage = useFormLanguage()

  useEffect(() => {
    setTable(parseDescriptionState(value))
  }, [value])

  const emitChange = (nextState) => {
    setTable(nextState)
    onChange?.(serializeDescriptionState(nextState))
  }

  const handleLabelChange = (columnId, updatedValue) => {
    const nextColumns = table.columns.map((column) =>
      column.id === columnId ? { ...column, labelValue: updatedValue } : column,
    )
    emitChange({ ...table, columns: nextColumns })
  }

  const handleCellChange = (rowId, columnId, updatedValue) => {
    const nextRows = table.rows.map((row) => {
      if (row.id !== rowId) return row
      return {
        ...row,
        cells: {
          ...row.cells,
          [columnId]: updatedValue,
        },
      }
    })
    emitChange({ ...table, rows: nextRows })
  }

  const handleAddRow = () => {
    if (disabled) return
    const nextRow = createEmptyRow(table.columns, table.rows.length)
    emitChange({ ...table, rows: [...table.rows, nextRow] })
  }

  const handleRemoveRow = (rowId) => {
    if (disabled) return
    emitChange({ ...table, rows: table.rows.filter((row) => row.id !== rowId) })
  }

  const handleAddColumn = () => {
    if (disabled) return
    const nextColumn = createEmptyColumn(table.columns.length)
    const nextColumns = [...table.columns, nextColumn]
    const nextRows = table.rows.map((row) => ({
      ...row,
      cells: {
        ...row.cells,
        [nextColumn.id]: defaultMultilingualValue(),
      },
    }))
    emitChange({ columns: nextColumns, rows: nextRows })
  }

  const handleRemoveColumn = (columnId) => {
    if (disabled || table.columns.length <= 1) return
    const nextColumns = table.columns.filter((column) => column.id !== columnId)
    const nextRows = table.rows.map((row) => {
      const { [columnId]: _removed, ...rest } = row.cells || {}
      return { ...row, cells: rest }
    })
    emitChange({ columns: nextColumns, rows: nextRows })
  }

  const activeLanguage = formLanguage?.activeLanguage ?? LANGUAGES[0].code

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${table.columns.length}, minmax(0, 1fr)) 56px`,
    }),
    [table.columns.length],
  )

  const getColumnPlaceholder = (column) => {
    const normalized = getColumnValue(column)
    const value =
      normalized?.[activeLanguage] ||
      normalized?.en ||
      normalized?.ru ||
      normalized?.uz
    return value || t("productDescription.newColumn", { defaultValue: "New column" })
  }

  const getColumnValue = (column) => {
    const value = column.labelValue || defaultMultilingualValue()
    if (column.id === "col_param" && value.en === "Parameter" && !value.ru && !value.uz) {
      return {
        ...value,
        ru: "Параметр",
        uz: "Parametr",
      }
    }
    if (column.id === "col_value" && value.en === "Value" && !value.ru && !value.uz) {
      return {
        ...value,
        ru: "Значение",
        uz: "Qiymat",
      }
    }
    return value
  }

  const fieldClass =
    "h-11 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
  const removeButtonClass =
    "h-9 w-9 rounded-full border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"

  return (
    <Card className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] py-4 shadow-none">
      <CardHeader className="space-y-3 px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-[18px] font-semibold text-[var(--text-primary)]">
            {label || t("productDescription.title", { defaultValue: "Product description" })}
          </CardTitle>
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {table.rows.length} × {table.columns.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span>{LANGUAGE_FLAGS[activeLanguage] || "🌐"}</span>
          <span>
            {t("productDescription.activeLanguage", { defaultValue: "Active language:" })}{" "}
            <strong className="font-semibold text-[var(--text-primary)]">
              {LANGUAGES.find((lang) => lang.code === activeLanguage)?.label || activeLanguage}
            </strong>
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5">
        <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] shadow-none">
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[820px] items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4"
              style={gridStyle}
            >
              {table.columns.map((column) => (
                <div key={column.id} className="flex w-full items-center gap-2">
                  <MultilingualInput
                    value={getColumnValue(column)}
                    onChange={(updated) => handleLabelChange(column.id, updated)}
                    disabled={disabled}
                    hideLanguageSwitcher
                    className={fieldClass}
                    placeholder={getColumnPlaceholder(column)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled || table.columns.length <= 1}
                    onClick={() => handleRemoveColumn(column.id)}
                    className={removeButtonClass}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="h-9" />
            </div>

            {table.rows.length === 0 ? (
              <div className="flex flex-col gap-4 px-5 py-6 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {t("productDescription.emptyRows", {
                    defaultValue: "No rows yet. Add the first one to start filling in specifications.",
                  })}
                </span>
                {!disabled && (
                  <Button
                    type="button"
                    onClick={handleAddRow}
                    className="h-10 min-w-[180px] justify-center gap-2 rounded-[10px] px-4 text-[13px] font-medium"
                  >
                    <ArrowUp className="h-4 w-4" />
                    {t("productDescription.addFirstRow", { defaultValue: "Add first row" })}
                  </Button>
                )}
              </div>
            ) : (
              table.rows.map((row) => (
                <div
                  key={row.id}
                  className="grid min-w-[820px] items-start gap-4 px-5 py-4"
                  style={gridStyle}
                >
                  {table.columns.map((column) => (
                    <MultilingualInput
                      key={`${row.id}-${column.id}`}
                      value={row.cells?.[column.id] || defaultMultilingualValue()}
                      onChange={(updated) => handleCellChange(row.id, column.id, updated)}
                      disabled={disabled}
                      hideLanguageSwitcher
                      className={fieldClass}
                      placeholder={getColumnPlaceholder(column)}
                    />
                  ))}
                  <div className="flex h-11 items-center justify-end">
                    {!disabled && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveRow(row.id)}
                        className={removeButtonClass}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {!disabled && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddColumn}
              className="h-11 w-full min-w-0 justify-center gap-2 rounded-[12px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-5 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              <ArrowRight className="h-4 w-4" />
              {t("productDescription.addColumn", { defaultValue: "Add column" })}
            </Button>
            <Button
              type="button"
              onClick={handleAddRow}
              className="h-11 w-full min-w-0 justify-center gap-2 rounded-[12px] px-5 text-[14px] font-medium"
            >
              <ArrowUp className="h-4 w-4" />
              {t("productDescription.addRow", { defaultValue: "Add row" })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
