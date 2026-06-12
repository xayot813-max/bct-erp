"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import BackLinkButton from "@/components/shared/BackLinkButton"
import { auditProductStock, getProducts, getWarehouses } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"
import { warehouseOptions } from "@/components/warehouse/warehouse-data"
import { adminService } from "@/lib/api-services"
import { getCurrentAccessToken, getCurrentAdminProfileId } from "@/lib/profile-test-data"

const getProductId = (item) => String(item?.id || item?._id || "")

const stockAtWarehouse = (item, warehouseId) => {
  const stock = item?.stock_by_warehouse || item?.stockByWarehouse || {}
  return Number(stock[warehouseId] ?? 0)
}

export default function WarehouseAuditPage() {
  const { t } = useTranslation("common")
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("warehouse-1")
  const [realStock, setRealStock] = useState({})
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const warehouseChoices = useMemo(() => {
    if (warehouses.length > 0) return warehouses
    return warehouseOptions.map((item) => ({
      id: item.id,
      name: t(item.nameKey || "", { defaultValue: item.fallbackName || item.name || item.id }),
    }))
  }, [t, warehouses])

  const selectedWarehouseName = useMemo(
    () => warehouseChoices.find((item) => item.id === selectedWarehouseId)?.name || selectedWarehouseId,
    [selectedWarehouseId, warehouseChoices],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const [productResponse, warehouseResponse] = await Promise.all([
          getProducts({ page: 1, limit: 500, owner_admin_id: getCurrentAdminProfileId(), is_test_data: true }),
          getWarehouses({ limit: 500 }),
        ])
        let rawProducts = extractArrayFromResponse(productResponse, ["products"])
        if ((!Array.isArray(rawProducts) || rawProducts.length === 0) && getCurrentAccessToken()) {
          const seeded = await adminService.seedTestProducts(getCurrentAccessToken())
          rawProducts = extractArrayFromResponse(seeded, ["products"])
        }
        const items = Array.isArray(rawProducts) ? rawProducts : []
        const warehouseItems = extractArrayFromResponse(warehouseResponse, ["data"])
          .map((item) => ({
            id: String(item.id || item._id || ""),
            name: item.name || item.id || item._id,
            is_active: item.is_active !== false,
          }))
          .filter((item) => item.id && item.is_active)
        if (!cancelled) {
          setProducts(items)
          setWarehouses(warehouseItems)
          if (warehouseItems[0]?.id) setSelectedWarehouseId(warehouseItems[0].id)
          setReason(t("warehouse.audit.defaultReason"))
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

  useEffect(() => {
    setRealStock(
      Object.fromEntries(
        products.map((item) => [getProductId(item), String(stockAtWarehouse(item, selectedWarehouseId))]),
      ),
    )
  }, [products, selectedWarehouseId])

  const changedItems = useMemo(() => {
    return products
      .map((product) => {
        const id = getProductId(product)
        const systemQuantity = stockAtWarehouse(product, selectedWarehouseId)
        const realQuantity = Number(realStock[id])
        if (!id || !Number.isFinite(realQuantity) || realQuantity < 0 || realQuantity === systemQuantity) return null
        return {
          id,
          name: product?.name || product?.title || id,
          systemQuantity,
          realQuantity,
          diff: realQuantity - systemQuantity,
        }
      })
      .filter(Boolean)
  }, [products, realStock, selectedWarehouseId])

  const submitAudit = async () => {
    const normalizedReason = reason.trim()
    if (!normalizedReason) {
      toastWarning({ title: t("warehouse.audit.reasonRequired") })
      return
    }
    if (changedItems.length === 0) {
      toastWarning({ title: t("warehouse.audit.noChanges") })
      return
    }

    setIsSaving(true)
    try {
      await auditProductStock({
        reason: normalizedReason,
        comment: t("warehouse.audit.documentComment", { warehouse: selectedWarehouseName }),
        operations: changedItems.map((item) => ({
          product_id: item.id,
          warehouse_id: selectedWarehouseId,
          warehouse: selectedWarehouseName,
          system_quantity: item.systemQuantity,
          real_quantity: item.realQuantity,
          reason: normalizedReason,
        })),
      })
      toastSuccess({
        title: t("warehouse.audit.saved"),
        description: t("warehouse.audit.savedDescription", { count: changedItems.length }),
      })
      setProducts((current) =>
        current.map((item) => {
          const id = getProductId(item)
          const changed = changedItems.find((row) => row.id === id)
          if (!changed) return item
          return {
            ...item,
            count: Number(item.count || 0) + changed.diff,
            stock_by_warehouse: {
              ...(item.stock_by_warehouse || item.stockByWarehouse || {}),
              [selectedWarehouseId]: changed.realQuantity,
            },
          }
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
    <div className="mx-auto w-[95%] max-w-[1320px] py-5">
      <div className="mb-8 flex min-w-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BackLinkButton href="/dashboard/werehouses" />
          <div>
            <h1 className="text-[52px] font-normal leading-none text-[var(--text-primary)]">
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
          {isSaving ? t("common.saving") : t("warehouse.audit.save")}
        </button>
      </div>

      <section className="mb-6 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-4 shadow-[var(--surface-shadow)]">
        <div className="grid gap-4 md:grid-cols-[220px_1fr_180px]">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">{t("warehouse.audit.fields.warehouse")}</label>
            <select value={selectedWarehouseId} onChange={(event) => setSelectedWarehouseId(event.target.value)} className="h-10 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[13px] text-[var(--text-primary)]">
              {warehouseChoices.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-secondary)]">{t("warehouse.audit.fields.reason")}</label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} className="h-10 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[13px] text-[var(--text-primary)]" />
          </div>
          <div>
            <span className="mb-1 block text-[11px] text-[var(--text-secondary)]">{t("warehouse.audit.changed")}</span>
            <div className="flex h-10 items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[13px] text-[var(--text-primary)]">
              {changedItems.length}
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <div className="overflow-x-auto px-3 pt-3">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[12px] text-[var(--text-primary)]">
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
                const id = getProductId(product)
                const systemQuantity = stockAtWarehouse(product, selectedWarehouseId)
                const realQuantity = Number(realStock[id])
                const diff = Number.isFinite(realQuantity) ? realQuantity - systemQuantity : 0
                return (
                  <tr key={id || index} className={index % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-elevated)]"}>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{index + 1}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.name || product.title || id}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{selectedWarehouseName}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{systemQuantity}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">
                      <input
                        type="number"
                        min="0"
                        value={realStock[id] ?? ""}
                        onChange={(event) => setRealStock((current) => ({ ...current, [id]: event.target.value }))}
                        className="h-9 w-28 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)]"
                      />
                    </td>
                    <td className={diff === 0 ? "px-4 py-4" : diff > 0 ? "px-4 py-4 text-emerald-400" : "px-4 py-4 text-red-400"}>{diff > 0 ? `+${diff}` : diff}</td>
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
