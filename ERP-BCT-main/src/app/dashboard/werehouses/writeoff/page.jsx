"use client"

import { useEffect, useMemo, useState } from "react"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import BackLinkButton from "@/components/shared/BackLinkButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getProducts, getWarehouses, writeoffProductStock } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { adminService } from "@/lib/api-services"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"
import { getCurrentAccessToken, getCurrentAdminProfileId } from "@/lib/profile-test-data"
import { warehouseOptions } from "@/components/warehouse/warehouse-data"

const createWriteoffLine = (defaults = {}) => ({
  productId: defaults.productId || "",
  warehouseId: defaults.warehouseId || "",
  quantity: defaults.quantity || "1",
  reason: defaults.reason || "",
  serialNumbers: defaults.serialNumbers || "",
})

const normalizeProduct = (item = {}) => {
  const stockByWarehouse = item?.stock_by_warehouse || item?.stockByWarehouse || {}
  const fallbackWarehouseId =
    item?.warehouse_id ||
    item?.warehouseId ||
    Object.keys(stockByWarehouse).find((key) => Number(stockByWarehouse[key]) > 0) ||
    "warehouse-1"

  return {
    id: String(item?.id || item?._id || ""),
    name: item?.name || item?.title || "—",
    count: Number(item?.count ?? 0),
    warehouseId: fallbackWarehouseId,
    warehouse: item?.warehouse || fallbackWarehouseId,
    stockByWarehouse,
  }
}

export default function WarehouseWriteoffPage() {
  const { t } = useTranslation("common")
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [lines, setLines] = useState([createWriteoffLine()])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const [response, warehouseResponse] = await Promise.all([
          getProducts({ page: 1, limit: 200, owner_admin_id: getCurrentAdminProfileId(), is_test_data: true }),
          getWarehouses({ limit: 500 }),
        ])

        let normalized = extractArrayFromResponse(response, ["products"])
        if ((!Array.isArray(normalized) || normalized.length === 0) && getCurrentAccessToken()) {
          const seeded = await adminService.seedTestProducts(getCurrentAccessToken())
          normalized = extractArrayFromResponse(seeded, ["products"])
        }

        normalized = Array.isArray(normalized) ? normalized.map(normalizeProduct) : []
        const warehouseItems = Array.isArray(warehouseResponse?.data)
          ? warehouseResponse.data
          : Array.isArray(warehouseResponse)
            ? warehouseResponse
            : []

        setProducts(normalized)
        setWarehouses(
          warehouseItems
            .map((item) => ({
              id: String(item.id || item._id || ""),
              name: item.name || item.id || item._id,
              is_active: item.is_active !== false,
            }))
            .filter((item) => item.id && item.is_active),
        )

        const firstProduct = normalized[0] || null
        const firstWarehouseId =
          firstProduct && typeof firstProduct.stockByWarehouse === "object"
            ? Object.keys(firstProduct.stockByWarehouse).find((key) => Number(firstProduct.stockByWarehouse[key]) > 0) || firstProduct.warehouseId
            : ""

        setLines((prev) =>
          prev.map((line, index) =>
            index === 0 && !line.productId
              ? { ...line, productId: firstProduct?.id || "", warehouseId: firstWarehouseId || "" }
              : line,
          ),
        )
      } catch (error) {
        console.error("Failed to load products for writeoff:", error)
        setProducts([])
        toastError({
          title: t("warehouse.messages.backendUnavailable.title"),
          description: error?.message,
        })
      }
    }

    loadProducts()
  }, [t])

  const warehouseChoices = useMemo(() => {
    if (warehouses.length > 0) return warehouses
    return warehouseOptions.map((item) => ({
      id: item.id,
      name: t(item.nameKey || "", { defaultValue: item.fallbackName || item.name || item.id }),
      is_active: true,
    }))
  }, [t, warehouses])

  const getSelectedProduct = (productId) =>
    products.find((product) => String(product.id) === productId) || null

  const getProductWarehouseChoices = (product) => {
    if (!product) return warehouseChoices
    const stockedWarehouses = Object.entries(product.stockByWarehouse || {})
      .filter(([, value]) => Number(value) > 0)
      .map(([warehouseId]) => warehouseChoices.find((item) => item.id === warehouseId) || { id: warehouseId, name: warehouseId })

    return stockedWarehouses.length > 0
      ? stockedWarehouses
      : warehouseChoices.filter((item) => item.id === product.warehouseId)
  }

  const updateLine = (index, field, value) => {
    setLines((prev) =>
      prev.map((line, lineIndex) => {
        if (lineIndex !== index) return line
        if (field !== "productId") return { ...line, [field]: value }

        const selectedProduct = getSelectedProduct(value)
        const warehouseId =
          Object.keys(selectedProduct?.stockByWarehouse || {}).find((key) => Number(selectedProduct?.stockByWarehouse?.[key]) > 0) ||
          selectedProduct?.warehouseId ||
          ""

        return {
          ...line,
          productId: value,
          warehouseId,
          serialNumbers: "",
        }
      }),
    )
  }

  const addLine = () => {
    const firstProduct = products[0] || null
    const warehouseId =
      Object.keys(firstProduct?.stockByWarehouse || {}).find((key) => Number(firstProduct?.stockByWarehouse?.[key]) > 0) ||
      firstProduct?.warehouseId ||
      ""
    setLines((prev) => [...prev, createWriteoffLine({ productId: firstProduct?.id || "", warehouseId })])
  }

  const removeLine = (index) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, lineIndex) => lineIndex !== index)))
  }

  const handleCreate = async () => {
    if (lines.length === 0) {
      toastWarning({ title: t("warehouse.receipt.validationRequired", { defaultValue: "Заполните все обязательные поля" }) })
      return
    }

    const normalizedLines = []
    const lineTotals = new Map()

    for (const line of lines) {
      const selectedProduct = getSelectedProduct(line.productId)
      const quantity = Number(line.quantity)
      const serialNumbers = line.serialNumbers
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
      const uniqueSerialCount = new Set(serialNumbers).size

      if (!selectedProduct) {
        toastWarning({ title: t("warehouse.dialogs.move.errors.product") })
        return
      }

      if (!line.warehouseId || !String(line.quantity || "").trim()) {
        toastWarning({ title: t("warehouse.receipt.validationRequired", { defaultValue: "Заполните все обязательные поля" }) })
        return
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        toastWarning({ title: t("warehouse.dialogs.writeoff.errors.quantity") })
        return
      }

      if (serialNumbers.length !== quantity || uniqueSerialCount !== serialNumbers.length) {
        toastWarning({ title: t("warehouse.receipt.validationSerials", { defaultValue: "Количество уникальных серийных номеров должно совпадать с количеством товара" }) })
        return
      }

      const availableInWarehouse = Number(selectedProduct.stockByWarehouse?.[line.warehouseId] ?? 0)
      const lineKey = `${selectedProduct.id}:${line.warehouseId}`
      const requestedQuantity = (lineTotals.get(lineKey) || 0) + quantity
      lineTotals.set(lineKey, requestedQuantity)

      if (requestedQuantity > availableInWarehouse) {
        toastWarning({
          title: t("warehouse.dialogs.writeoff.errors.stock"),
          description: t("warehouse.dialogs.writeoff.errors.stockDescription", {
            count: availableInWarehouse,
            defaultValue: `Доступно: ${availableInWarehouse}`,
          }),
        })
        return
      }

      const warehouse = warehouseChoices.find((item) => item.id === line.warehouseId)
      normalizedLines.push({
        product_id: line.productId,
        quantity,
        source_warehouse_id: line.warehouseId,
        source_warehouse: warehouse?.name || line.warehouseId,
        reason: line.reason.trim(),
        serial_numbers: serialNumbers,
      })
    }

    setIsSaving(true)
    try {
      await writeoffProductStock({
        operations: normalizedLines,
      })

      toastSuccess({ title: t("warehouse.messages.writeoffSuccess.title") })
      router.push("/dashboard/werehouses")
    } catch (error) {
      console.error("Failed to save writeoff:", error)
      toastError({
        title: t("warehouse.receipt.saveError", { defaultValue: "Не удалось сохранить операцию" }),
        description: error?.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1380px] py-5">
      <div className="mb-8 flex items-center gap-4">
        <BackLinkButton href="/dashboard/werehouses" />
        <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
          {t("warehouse.writeoffCreateTitle")}
        </h1>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
          <div className="space-y-5">
            {lines.map((line, index) => {
              const selectedProduct = getSelectedProduct(line.productId)
              const sourceWarehouses = getProductWarehouseChoices(selectedProduct)
              const selectedWarehouseId = line.warehouseId || sourceWarehouses[0]?.id || ""
              const availableCount = Number(selectedProduct?.stockByWarehouse?.[selectedWarehouseId] ?? selectedProduct?.count ?? 0)

              return (
                <div key={`writeoff-line-${index}`} className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
                      {t("warehouse.transactions.form.addLine", { defaultValue: "Строка" })} {index + 1}
                    </h2>
                    {lines.length > 1 && (
                      <Button type="button" variant="outline" onClick={() => removeLine(index)} className="h-10 rounded-[10px] px-3">
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("common.delete", { defaultValue: "Удалить" })}
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium text-[var(--text-primary)]">
                        {t("warehouse.dialogs.writeoff.fields.product", { defaultValue: "Товар" })}*
                      </label>
                      <Select value={line.productId} onValueChange={(value) => updateLine(index, "productId", value)}>
                        <SelectTrigger className="h-12 rounded-[10px] text-[15px]">
                          <SelectValue placeholder={t("warehouse.dialogs.move.placeholders.product", { defaultValue: "Выберите товар" })} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-medium text-[var(--text-primary)]">
                        {t("warehouse.table.quantity", { defaultValue: "Количество" })}*
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(event) => updateLine(index, "quantity", event.target.value)}
                        className="h-12 rounded-[10px] text-[15px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-medium text-[var(--text-primary)]">
                        {t("warehouse.table.warehouse", { defaultValue: "Склад" })}*
                      </label>
                      <Select value={selectedWarehouseId} onValueChange={(value) => updateLine(index, "warehouseId", value)}>
                        <SelectTrigger className="h-12 rounded-[10px] text-[15px]">
                          <SelectValue placeholder={t("warehouse.dialogs.move.fields.sourceWarehouse", { defaultValue: "Выберите склад" })} />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceWarehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        {t("warehouse.dialogs.writeoff.errors.stockDescription", {
                          count: availableCount,
                          defaultValue: `Доступно: ${availableCount}`,
                        })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-medium text-[var(--text-primary)]">
                        {t("warehouse.dialogs.writeoff.fields.reason", { defaultValue: "Причина" })}
                      </label>
                      <Input
                        value={line.reason}
                        onChange={(event) => updateLine(index, "reason", event.target.value)}
                        placeholder={t("warehouse.dialogs.writeoff.placeholders.reason", { defaultValue: "Укажите причину списания" })}
                        className="h-12 rounded-[10px] text-[15px]"
                      />
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-[14px] font-medium text-[var(--text-primary)]">
                        {t("warehouse.receipt.fields.serialNumbers", { defaultValue: "Серийные номера" })}*
                      </label>
                      <Textarea
                        value={line.serialNumbers}
                        onChange={(event) => updateLine(index, "serialNumbers", event.target.value)}
                        placeholder={t("warehouse.receipt.placeholders.serialNumbers", { defaultValue: "Введите каждый серийный номер с новой строки" })}
                        className="min-h-[120px] rounded-[12px] text-[15px]"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Button type="button" variant="outline" onClick={addLine} className="h-12 w-full rounded-[12px]">
            {t("warehouse.transactions.form.addLine", { defaultValue: "Добавить строку" })}
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isSaving} className="h-12 w-full rounded-[12px]">
            {isSaving ? t("common.saving", { defaultValue: "Сохранение..." }) : t("warehouse.actions.createWriteoff", { defaultValue: "Создать списание" })}
          </Button>
        </div>
      </div>
    </div>
  )
}
