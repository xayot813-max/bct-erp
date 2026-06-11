"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import BackLinkButton from "@/components/shared/BackLinkButton"
import { auditProductStock, getProducts } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"

const normalizeProduct = (item, index) => {
  const stockByWarehouse = item?.stock_by_warehouse || item?.stockByWarehouse || {}
  const warehouseId =
    item?.warehouse_id ||
    item?.warehouseId ||
    Object.keys(stockByWarehouse).find((key) => Number(stockByWarehouse[key]) > 0) ||
    "warehouse-1"

  return {
    id: String(item?.id || item?._id || index + 1),
    name: item?.name || item?.title || `Product ${index + 1}`,
    warehouseId,
    warehouse: item?.warehouse || warehouseId,
    systemQuantity: Number(stockByWarehouse[warehouseId] ?? item?.count ?? 0),
  }
}

export default function WarehouseAuditPage() {
  const { t } = useTranslation("common")
  const [products, setProducts] = useState([])
  const [realStock, setRealStock] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const response = await getProducts({ page: 1, limit: 500 })
        const items = extractArrayFromResponse(response, ["products"]).map(normalizeProduct)
        if (!cancelled) {
          setProducts(items)
          setRealStock(Object.fromEntries(items.map((item) => [item.id, String(item.systemQuantity)])))
        }
      } catch (error) {
        console.error("Failed to load products for audit:", error)
        toastError({ title: t("warehouse.audit.loadError"), description: error?.message })
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [t])

  const changedItems = useMemo(() => {
    return products
      .map((product) => {
        const realQuantity = Number(realStock[product.id])
        if (!Number.isFinite(realQuantity) || realQuantity < 0 || realQuantity === product.systemQuantity) return null
        return { ...product, realQuantity }
      })
      .filter(Boolean)
  }, [products, realStock])

  const submitAudit = async () => {
    if (changedItems.length === 0) {
      toastWarning({ title: t("warehouse.audit.noChanges") })
      return
    }

    setIsSaving(true)
    try {
      await auditProductStock({
        reason: t("warehouse.audit.defaultReason"),
        operations: changedItems.map((item) => ({
          product_id: item.id,
          warehouse_id: item.warehouseId,
          warehouse: item.warehouse,
          system_quantity: item.systemQuantity,
          real_quantity: item.realQuantity,
          reason: t("warehouse.audit.defaultReason"),
        })),
      })
      toastSuccess({ title: t("warehouse.audit.saved"), description: t("warehouse.audit.savedDescription", { count: changedItems.length }) })
      setProducts((current) =>
        current.map((item) => {
          const changed = changedItems.find((row) => row.id === item.id)
          return changed ? { ...item, systemQuantity: changed.realQuantity } : item
        }),
      )
    } catch (error) {
      console.error("Failed to save audit:", error)
      toastError({ title: t("warehouse.audit.saveError"), description: error?.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-8 flex min-w-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BackLinkButton href="/dashboard/werehouses" />
          <div>
            <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
              {t("warehouse.audit.title")}
            </h1>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{t("warehouse.audit.subtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={submitAudit}
          disabled={isSaving || changedItems.length === 0}
          className="h-10 rounded-[10px] bg-[var(--primary)] px-5 text-[13px] font-medium text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("warehouse.audit.save")}
        </button>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <div className="overflow-x-auto px-3 pt-3">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-[12px] text-[var(--text-primary)]">
            <thead>
              <tr className="text-[var(--text-secondary)]">
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">#</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.audit.columns.product")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.audit.columns.warehouse")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.audit.columns.system")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.audit.columns.real")}</th>
                <th className="border-b border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.audit.columns.diff")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => {
                const realQuantity = Number(realStock[product.id])
                const diff = Number.isFinite(realQuantity) ? realQuantity - product.systemQuantity : 0
                return (
                  <tr key={product.id} className={index % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-elevated)]"}>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{index + 1}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.name}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.warehouse}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.systemQuantity}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">
                      <input
                        type="number"
                        min="0"
                        value={realStock[product.id] ?? ""}
                        onChange={(event) => setRealStock((current) => ({ ...current, [product.id]: event.target.value }))}
                        className="h-9 w-28 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)]"
                      />
                    </td>
                    <td className="px-4 py-4">{diff > 0 ? `+${diff}` : diff}</td>
                  </tr>
                )
              })}
              {(products.length === 0 || isLoading) && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-secondary)]">
                    {isLoading ? t("common.loading") : t("warehouse.audit.empty")}
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
