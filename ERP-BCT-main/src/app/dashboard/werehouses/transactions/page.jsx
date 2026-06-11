"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"

import BackLinkButton from "@/components/shared/BackLinkButton"
import {
  applyProductStockBulk,
  getInventoryTransactions,
  getProducts,
  getWarehouses,
} from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"
import { warehouseOptions } from "@/components/warehouse/warehouse-data"

const operationTypes = ["receipt", "writeoff", "movement", "adjustment"]
const fallbackId = () => `line-${Date.now()}-${Math.random().toString(16).slice(2)}`
const normalizeRequestedType = (value) => (operationTypes.includes(value) ? value : "movement")

const emptyLine = () => ({
  lineId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : fallbackId(),
  productId: "",
  quantity: "1",
  realQuantity: "0",
  sourceWarehouseId: "",
  targetWarehouseId: "",
})

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

const getProductId = (product) => String(product?.id || product?._id || "")

const getProductStock = (product, warehouseId) => {
  const stock = product?.stock_by_warehouse || product?.stockByWarehouse || {}
  if (warehouseId) return Number(stock[warehouseId] ?? 0)
  return Number(product?.count ?? 0)
}

export default function WarehouseTransactionsPage() {
  const { t, i18n } = useTranslation("common")
  const searchParams = useSearchParams()
  const [rows, setRows] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const requestedType = normalizeRequestedType(searchParams.get("type") || "movement")
  const [form, setForm] = useState({
    type: requestedType,
    reason: "",
    comment: "",
  })
  const [lines, setLines] = useState([emptyLine()])
  const [postedDocument, setPostedDocument] = useState(null)

  const locale = useMemo(() => {
    const language = (i18n.resolvedLanguage || i18n.language || "ru").toLowerCase()
    if (language.startsWith("uz")) return "uz-UZ"
    if (language.startsWith("en")) return "en-US"
    return "ru-RU"
  }, [i18n.language, i18n.resolvedLanguage])

  const warehouseChoices = useMemo(() => {
    if (warehouses.length > 0) return warehouses
    return warehouseOptions.map((item) => ({
      id: item.id,
      name: t(item.nameKey || "", { defaultValue: item.fallbackName || item.name || item.id }),
    }))
  }, [t, warehouses])

  const productMap = useMemo(
    () => new Map(products.map((product) => [getProductId(product), product])),
    [products],
  )
  const warehouseMap = useMemo(
    () => new Map(warehouseChoices.map((warehouse) => [warehouse.id, warehouse.name || warehouse.id])),
    [warehouseChoices],
  )

  const loadJournal = useCallback(async () => {
    const response = await getInventoryTransactions({ page: 1, limit: 150 })
    setRows(extractArrayFromResponse(response))
  }, [])

  const loadProducts = useCallback(async () => {
    const response = await getProducts({ page: 1, limit: 500 })
    setProducts(extractArrayFromResponse(response, ["products"]))
  }, [])

  useEffect(() => {
    setForm((current) => (current.type === requestedType ? current : { ...current, type: requestedType }))
    setLines((current) =>
      current.map((line) => ({
        ...line,
        sourceWarehouseId: requestedType === "receipt" || requestedType === "adjustment" ? "" : line.sourceWarehouseId,
        targetWarehouseId: requestedType === "writeoff" ? "" : line.targetWarehouseId,
      })),
    )
  }, [requestedType])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const [operationResponse, productResponse, warehouseResponse] = await Promise.all([
          getInventoryTransactions({ page: 1, limit: 150 }),
          getProducts({ page: 1, limit: 500 }),
          getWarehouses({ limit: 500 }),
        ])
        if (cancelled) return
        setRows(extractArrayFromResponse(operationResponse))
        setProducts(extractArrayFromResponse(productResponse, ["products"]))
        const warehouseItems = extractArrayFromResponse(warehouseResponse, ["data"])
          .map((item) => ({
            id: String(item.id || item._id || ""),
            name: item.name || item.id || item._id,
            is_active: item.is_active !== false,
          }))
          .filter((item) => item.id && item.is_active)
        setWarehouses(warehouseItems)
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

  const updateLine = (lineId, patch) => {
    setLines((current) => current.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line)))
  }

  const addLine = () => setLines((current) => [...current, emptyLine()])
  const removeLine = (lineId) => setLines((current) => (current.length === 1 ? current : current.filter((line) => line.lineId !== lineId)))
  const updateType = (type) => {
    setForm((current) => ({ ...current, type }))
    setLines((current) =>
      current.map((line) => ({
        ...line,
        sourceWarehouseId: type === "receipt" || type === "adjustment" ? "" : line.sourceWarehouseId,
        targetWarehouseId: type === "writeoff" ? "" : line.targetWarehouseId,
      })),
    )
  }

  const submitTransaction = async () => {
    const reason = form.reason.trim()
    if (!reason) {
      toastWarning({ title: t("warehouse.transactions.form.validation.reason") })
      return
    }

    const operations = []
    for (const line of lines) {
      const product = productMap.get(line.productId)
      if (!product) {
        toastWarning({ title: t("warehouse.transactions.form.validation.product") })
        return
      }

      const quantity = Number(line.quantity)
      const realQuantity = Number(line.realQuantity)
      const sourceWarehouseId = line.sourceWarehouseId
      const targetWarehouseId = line.targetWarehouseId

      if (form.type === "movement" && (!sourceWarehouseId || !targetWarehouseId || sourceWarehouseId === targetWarehouseId)) {
        toastWarning({ title: t("warehouse.transactions.form.validation.route") })
        return
      }
      if ((form.type === "writeoff" || form.type === "receipt") && !targetWarehouseId && !sourceWarehouseId) {
        toastWarning({ title: t("warehouse.transactions.form.validation.warehouse") })
        return
      }
      if (form.type !== "adjustment" && (!Number.isFinite(quantity) || quantity <= 0)) {
        toastWarning({ title: t("warehouse.transactions.form.validation.quantity") })
        return
      }
      if (form.type === "adjustment" && (!targetWarehouseId || !Number.isFinite(realQuantity) || realQuantity < 0)) {
        toastWarning({ title: t("warehouse.transactions.form.validation.realQuantity") })
        return
      }

      const operation = {
        product_id: line.productId,
        type: form.type,
        reason,
        comment: form.comment.trim(),
      }

      if (form.type === "receipt") {
        operation.quantity = quantity
        operation.warehouse_id = targetWarehouseId || sourceWarehouseId
        operation.warehouse = warehouseMap.get(operation.warehouse_id) || operation.warehouse_id
      } else if (form.type === "writeoff") {
        operation.quantity = quantity
        operation.source_warehouse_id = sourceWarehouseId || targetWarehouseId
        operation.source_warehouse = warehouseMap.get(operation.source_warehouse_id) || operation.source_warehouse_id
      } else if (form.type === "movement") {
        operation.quantity = quantity
        operation.source_warehouse_id = sourceWarehouseId
        operation.source_warehouse = warehouseMap.get(sourceWarehouseId) || sourceWarehouseId
        operation.warehouse_id = targetWarehouseId
        operation.warehouse = warehouseMap.get(targetWarehouseId) || targetWarehouseId
      } else {
        operation.warehouse_id = targetWarehouseId
        operation.warehouse = warehouseMap.get(targetWarehouseId) || targetWarehouseId
        operation.system_quantity = getProductStock(product, targetWarehouseId)
        operation.real_quantity = realQuantity
      }
      operations.push(operation)
    }

    setIsSaving(true)
    try {
      const result = await applyProductStockBulk({
        type: form.type,
        reason,
        comment: form.comment.trim(),
        operations,
      })
      const operationDocs = Array.isArray(result?.operations) ? result.operations : []
      const documentId = operationDocs[0]?.document_id || result?.document_id || "-"
      toastSuccess({
        title: t("warehouse.transactions.form.saved"),
        description: t("warehouse.transactions.form.savedDescription", { count: operations.length }),
      })
      setPostedDocument({
        id: documentId,
        type: form.type,
        lines: operations.length,
      })
      setForm({ type: form.type, reason: "", comment: "" })
      setLines([emptyLine()])
      await Promise.all([loadJournal(), loadProducts()])
    } catch (error) {
      console.error("Failed to create inventory transaction:", error)
      toastError({ title: t("warehouse.transactions.form.saveError"), description: error?.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1320px] py-5">
      <div className="mb-8 flex min-w-0 items-center gap-4">
        <BackLinkButton href="/dashboard/werehouses" />
        <div>
          <h1 className="text-[52px] font-normal leading-none text-[var(--text-primary)]">
            {t("warehouse.transactions.title")}
          </h1>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            {t("warehouse.transactions.subtitle")}
          </p>
        </div>
      </div>

      <section className="mb-6 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-4 shadow-[var(--surface-shadow)]">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">{t("warehouse.transactions.form.type")}</label>
            <select value={form.type} onChange={(event) => updateType(event.target.value)} className="h-10 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[13px] text-[var(--text-primary)]">
              {operationTypes.map((type) => (
                <option key={type} value={type}>{operationLabel(t, type)}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[240px] flex-[2]">
            <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">{t("warehouse.transactions.form.reason")}</label>
            <input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className="h-10 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[13px] text-[var(--text-primary)]" />
          </div>
          <div className="min-w-[240px] flex-[2]">
            <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">{t("warehouse.transactions.form.comment")}</label>
            <input value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} className="h-10 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[13px] text-[var(--text-primary)]" />
          </div>
          <button type="button" onClick={submitTransaction} disabled={isSaving} className="h-10 rounded-[8px] bg-[var(--primary)] px-5 text-[13px] font-medium text-[var(--primary-foreground)] disabled:opacity-60">
            {isSaving ? t("common.saving") : t("warehouse.transactions.form.post")}
          </button>
        </div>
        {postedDocument && (
          <div className="mb-4 rounded-[8px] border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-200">
            {t("warehouse.transactions.form.postedDocument", {
              document: postedDocument.id,
              type: operationLabel(t, postedDocument.type),
              count: postedDocument.lines,
            })}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[12px]">
            <thead className="text-[var(--text-secondary)]">
              <tr>
                <th className="border-b border-[var(--border-subtle)] px-3 py-3 text-left font-normal">{t("warehouse.transactions.columns.product")}</th>
                {form.type !== "receipt" && form.type !== "adjustment" && (
                  <th className="border-b border-[var(--border-subtle)] px-3 py-3 text-left font-normal">{t("warehouse.transactions.columns.from")}</th>
                )}
                {form.type !== "writeoff" && (
                  <th className="border-b border-[var(--border-subtle)] px-3 py-3 text-left font-normal">{t("warehouse.transactions.columns.to")}</th>
                )}
                <th className="border-b border-[var(--border-subtle)] px-3 py-3 text-left font-normal">{form.type === "adjustment" ? t("warehouse.audit.columns.real") : t("warehouse.transactions.columns.quantity")}</th>
                <th className="border-b border-[var(--border-subtle)] px-3 py-3 text-left font-normal">
                  {form.type === "receipt" ? t("warehouse.transactions.form.currentStock") : t("warehouse.transactions.form.available")}
                </th>
                <th className="border-b border-[var(--border-subtle)] px-3 py-3 text-right font-normal">{t("warehouse.transactions.form.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const product = productMap.get(line.productId)
                return (
                  <tr key={line.lineId}>
                    <td className="px-3 py-3">
                      <select value={line.productId} onChange={(event) => updateLine(line.lineId, { productId: event.target.value })} className="h-9 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2 text-[12px] text-[var(--text-primary)]">
                        <option value="">{t("warehouse.transactions.form.selectProduct")}</option>
                        {products.map((item) => {
                          const id = getProductId(item)
                          return <option key={id} value={id}>{item.name || item.title || id}</option>
                        })}
                      </select>
                    </td>
                    {form.type !== "receipt" && form.type !== "adjustment" && (
                      <td className="px-3 py-3">
                        <select value={line.sourceWarehouseId} onChange={(event) => updateLine(line.lineId, { sourceWarehouseId: event.target.value })} className="h-9 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2 text-[12px] text-[var(--text-primary)]">
                          <option value="">{t("warehouse.transactions.form.selectWarehouse")}</option>
                          {warehouseChoices.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.id}</option>)}
                        </select>
                      </td>
                    )}
                    {form.type !== "writeoff" && (
                      <td className="px-3 py-3">
                        <select value={line.targetWarehouseId} onChange={(event) => updateLine(line.lineId, { targetWarehouseId: event.target.value })} className="h-9 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2 text-[12px] text-[var(--text-primary)]">
                          <option value="">{t("warehouse.transactions.form.selectWarehouse")}</option>
                          {warehouseChoices.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.id}</option>)}
                        </select>
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <input type="number" min="0" value={form.type === "adjustment" ? line.realQuantity : line.quantity} onChange={(event) => updateLine(line.lineId, form.type === "adjustment" ? { realQuantity: event.target.value } : { quantity: event.target.value })} className="h-9 w-28 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)]" />
                    </td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{product ? getProductStock(product, line.sourceWarehouseId || line.targetWarehouseId) : "-"}</td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" onClick={() => removeLine(line.lineId)} disabled={lines.length === 1} className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-40" title={t("common.delete")}><Trash2 size={15} /></button>
                      <button type="button" onClick={addLine} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-default)] text-[var(--text-secondary)]" title={t("warehouse.transactions.form.addLine")}><Plus size={15} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <div className="overflow-x-auto px-3 pt-3">
          <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-[12px] text-[var(--text-primary)]">
            <thead>
              <tr className="text-[var(--text-secondary)]">
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">#</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.transactions.columns.document")}</th>
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
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.document_id || "-"}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{operationLabel(t, row.type)}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.product_name || row.product_id || "-"}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.source_warehouse || row.source_warehouse_id || "-"}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.target_warehouse || row.target_warehouse_id || "-"}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.quantity ?? "-"}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{row.previous_count ?? "-"} {"->"} {row.next_count ?? "-"}</td>
                  <td className="px-4 py-4">{formatDate(row.created_at || row.createdAt, locale)}</td>
                </tr>
              ))}
              {(rows.length === 0 || isLoading) && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[var(--text-secondary)]">
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
