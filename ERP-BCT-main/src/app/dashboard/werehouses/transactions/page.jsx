"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import BackLinkButton from "@/components/shared/BackLinkButton"
import { getInventoryTransactions } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { toastError } from "@/lib/toast"

const formatDate = (value, locale) => {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

const operationLabel = (t, type) =>
  t(`warehouse.transactions.types.${type || "unknown"}`, { defaultValue: type || "-" })

export default function WarehouseTransactionsPage() {
  const { t, i18n } = useTranslation("common")
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const locale = useMemo(() => {
    const language = (i18n.resolvedLanguage || i18n.language || "ru").toLowerCase()
    if (language.startsWith("uz")) return "uz-UZ"
    if (language.startsWith("en")) return "en-US"
    return "ru-RU"
  }, [i18n.language, i18n.resolvedLanguage])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const response = await getInventoryTransactions({ page: 1, limit: 100 })
        if (!cancelled) setRows(extractArrayFromResponse(response))
      } catch (error) {
        console.error("Failed to load inventory transactions:", error)
        toastError({
          title: t("warehouse.transactions.loadError"),
          description: error?.message,
        })
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-8 flex min-w-0 items-center gap-4">
        <BackLinkButton href="/dashboard/werehouses" />
        <div>
          <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {t("warehouse.transactions.title")}
          </h1>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            {t("warehouse.transactions.subtitle")}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <div className="overflow-x-auto px-3 pt-3">
          <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-[12px] text-[var(--text-primary)]">
            <thead>
              <tr className="text-[var(--text-secondary)]">
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">#</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.transactions.columns.type")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.transactions.columns.product")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.transactions.columns.from")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.transactions.columns.to")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.transactions.columns.quantity")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.transactions.columns.beforeAfter")}</th>
                <th className="border-b border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.transactions.columns.date")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || row._id || index} className={index % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-elevated)]"}>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{index + 1}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{operationLabel(t, row.type)}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.product_name || row.product_id || "-"}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.source_warehouse || row.source_warehouse_id || "-"}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.target_warehouse || row.target_warehouse_id || "-"}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.quantity ?? "-"}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.previous_count ?? "-"} → {row.next_count ?? "-"}</td>
                  <td className="px-4 py-4">{formatDate(row.created_at || row.createdAt, locale)}</td>
                </tr>
              ))}
              {(rows.length === 0 || isLoading) && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[var(--text-secondary)]">
                    {isLoading ? t("common.loading") : t("warehouse.transactions.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
