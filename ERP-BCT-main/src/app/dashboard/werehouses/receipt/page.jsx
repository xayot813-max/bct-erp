"use client"

import { useEffect, useMemo, useState } from "react"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { applyProductStockBulk, getProducts, getWarehouses } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"
import AddImages from "@/components/shared/AddImages"
import { warehouseOptions } from "@/components/warehouse/warehouse-data"
import { adminService } from "@/lib/api-services"
import { getCurrentAccessToken, getCurrentAdminProfileId } from "@/lib/profile-test-data"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const createReceiptLine = (defaults = {}) => ({
  productId: defaults.productId || "",
  quantity: defaults.quantity || "",
  serialNumbers: defaults.serialNumbers || "",
  expirationValue: defaults.expirationValue || "",
  expirationUnit: defaults.expirationUnit || "years",
  warehouse: defaults.warehouse || "warehouse-1",
})

export default function WarehouseReceiptPage() {
  const { t } = useTranslation("common")
  const router = useRouter()
  const [images, setImages] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [lines, setLines] = useState([createReceiptLine()])

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

        normalized = Array.isArray(normalized) ? normalized : []
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

      } catch (error) {
        console.error("Failed to load products for receipt:", error)
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

  const updateLine = (index, field, value) => {
    setLines((prev) =>
      prev.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    )
  }

  const addLine = () => {
    setLines((prev) => [...prev, createReceiptLine()])
  }

  const removeLine = (index) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, lineIndex) => lineIndex !== index)))
  }

  const getSelectedProduct = (productId) =>
    products.find((product) => String(product.id || product._id) === productId) || null

  const handleCreate = async () => {
    if (lines.length === 0) {
      toastWarning({
        title: t("warehouse.receipt.validationRequired", {
          defaultValue: "Заполните все обязательные поля",
        }),
      })
      return
    }

    const normalizedLines = []

    for (const line of lines) {
      const selectedProduct = getSelectedProduct(line.productId)
      const quantity = Number(line.quantity)
      const serialNumbers = line.serialNumbers
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
      const uniqueSerialCount = new Set(serialNumbers).size
      const expirationValue = Number(line.expirationValue)

      if (!selectedProduct) {
        toastWarning({
          title: t("warehouse.receipt.validationProduct", {
            defaultValue: "Выберите товар для поставки",
          }),
        })
        return
      }

      if (!String(line.quantity || "").trim() || !String(line.warehouse || "").trim()) {
        toastWarning({
          title: t("warehouse.receipt.validationRequired", {
            defaultValue: "Заполните все обязательные поля",
          }),
        })
        return
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        toastWarning({
          title: t("warehouse.receipt.validationQuantity", {
            defaultValue: "Количество должно быть больше нуля",
          }),
        })
        return
      }

      if (serialNumbers.length !== quantity || uniqueSerialCount !== serialNumbers.length) {
        toastWarning({
          title: t("warehouse.receipt.validationSerials", {
            defaultValue: "Количество уникальных серийных номеров должно совпадать с количеством товара",
          }),
        })
        return
      }

      if (!Number.isFinite(expirationValue) || expirationValue <= 0) {
        toastWarning({
          title: t("warehouse.receipt.validationExpiration", {
            defaultValue: "Укажите срок годности и единицу измерения",
          }),
        })
        return
      }

      const warehouse = warehouseChoices.find((item) => item.id === line.warehouse)
      normalizedLines.push({
        productId: line.productId,
        quantity,
        warehouseId: line.warehouse,
        warehouseName: warehouse?.name || line.warehouse,
        serialNumbers,
        expirationValue,
        expirationUnit: line.expirationUnit,
      })
    }

    setIsSaving(true)
    try {
      await applyProductStockBulk({
        type: "receipt",
        operations: normalizedLines.map((line) => ({
          product_id: line.productId,
          type: "receipt",
          quantity: line.quantity,
          warehouse_id: line.warehouseId,
          warehouse: line.warehouseName,
          serial_numbers: line.serialNumbers,
          expiration_value: line.expirationValue,
          expiration_unit: line.expirationUnit,
          comment: [
            `${t("warehouse.receipt.fields.serialNumbers", { defaultValue: "Серийные номера" })}: ${line.serialNumbers.join(", ")}`,
            `${t("warehouse.receipt.fields.expirationPeriod", { defaultValue: "Срок годности" })}: ${line.expirationValue} ${t(`warehouse.receipt.expirationUnits.${line.expirationUnit}`, { defaultValue: line.expirationUnit })}`,
          ].filter(Boolean).join("; "),
          files: images.map((image) => image.path || image.url).filter(Boolean),
        })),
      })

      toastSuccess({ title: t("warehouse.messages.receiptSaved") })
      router.push("/dashboard/werehouses")
    } catch (error) {
      console.error("Failed to save receipt:", error)
      toastError({
        title: t("warehouse.receipt.saveError", { defaultValue: "Не удалось сохранить поставку" }),
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
          {t("warehouse.links.receipt.title")}
        </h1>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
          <div className="space-y-5">
            {lines.map((line, index) => (
              <div key={`receipt-line-${index}`} className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
                    {t("warehouse.transactions.form.addLine", { defaultValue: "Добавить строку" })} {index + 1}
                  </h2>
                  {lines.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeLine(index)}
                      className="h-10 rounded-[10px] px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
                      {t("warehouse.receipt.fields.productName")}<span className="text-[var(--danger)]">*</span>
                    </label>
                    <Select value={line.productId} onValueChange={(value) => updateLine(index, "productId", value)}>
                      <SelectTrigger className="h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]">
                        <SelectValue placeholder={t("warehouse.dialogs.move.placeholders.product")} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => {
                          const productId = String(product.id || product._id)
                          return (
                            <SelectItem key={productId} value={productId}>
                              {product.name || product.title || productId}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
                      {t("warehouse.table.quantity")}<span className="text-[var(--danger)]">*</span>
                    </label>
                    <input
                      value={line.quantity}
                      type="number"
                      min="1"
                      onChange={(event) => updateLine(index, "quantity", event.target.value)}
                      className="h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
                      {t("warehouse.receipt.fields.serialNumbers", { defaultValue: "Серийные номера" })}<span className="text-[var(--danger)]">*</span>
                    </label>
                    <textarea
                      value={line.serialNumbers}
                      onChange={(event) => updateLine(index, "serialNumbers", event.target.value)}
                      placeholder={t("warehouse.receipt.placeholders.serialNumbers", {
                        defaultValue: "Введите каждый серийный номер с новой строки",
                      })}
                      className="min-h-[110px] w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-3 text-[14px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                    />
                    <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                      {t("warehouse.receipt.serialHint", {
                        defaultValue: "Для каждой единицы товара нужен отдельный уникальный серийный номер.",
                      })}
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
                    <div>
                      <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
                        {t("warehouse.receipt.fields.expirationPeriod", { defaultValue: "Срок годности" })}<span className="text-[var(--danger)]">*</span>
                      </label>
                      <input
                        value={line.expirationValue}
                        type="number"
                        min="1"
                        onChange={(event) => updateLine(index, "expirationValue", event.target.value)}
                        className="h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
                        {t("warehouse.receipt.fields.expirationUnit", { defaultValue: "Единица" })}<span className="text-[var(--danger)]">*</span>
                      </label>
                      <Select value={line.expirationUnit} onValueChange={(value) => updateLine(index, "expirationUnit", value)}>
                        <SelectTrigger className="h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["days", "months", "years"].map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {t(`warehouse.receipt.expirationUnits.${unit}`, { defaultValue: unit })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
                      {t("warehouse.table.warehouse")}<span className="text-[var(--danger)]">*</span>
                    </label>
                    <Select value={line.warehouse} onValueChange={(value) => updateLine(index, "warehouse", value)}>
                      <SelectTrigger className="h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouseChoices.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name || item.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <Button type="button" variant="outline" onClick={addLine} className="h-10 rounded-[10px] px-4">
                {t("warehouse.transactions.form.addLine", { defaultValue: "Добавить строку" })}
              </Button>

              <div className="flex gap-3">
                <Button type="button" onClick={handleCreate} disabled={isSaving} className="h-10 rounded-[10px] px-5 text-[13px]">
                  {t("warehouse.actions.create")}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard/werehouses")} disabled={isSaving} className="h-10 rounded-[10px] px-5 text-[13px]">
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AddImages
          images={images}
          setImages={setImages}
          maxImages={4}
          title={t("warehouse.receipt.addPhoto")}
          infoText={t("warehouse.receipt.photoInfo", {
            defaultValue: "Можно добавить до 4 фотографий товара или документов.",
          })}
          sticky={false}
        />
      </div>
    </div>
  )
}
