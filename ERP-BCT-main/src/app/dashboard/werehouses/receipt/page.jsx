"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { adjustProductStock, getProducts, getWarehouses } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"
import AddImages from "@/components/shared/AddImages"
import { warehouseOptions } from "@/components/warehouse/warehouse-data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function WarehouseReceiptPage() {
  const { t } = useTranslation("common")
  const router = useRouter()
  const [images, setImages] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    quantity: "1",
    serialNumbers: "",
    expirationValue: "5",
    expirationUnit: "years",
    warehouse: "warehouse-1",
  })

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const [response, warehouseResponse] = await Promise.all([
          getProducts({ page: 1, limit: 200 }),
          getWarehouses({ limit: 500 }),
        ])
        const items = extractArrayFromResponse(response, ["products"])
        const normalized = Array.isArray(items) ? items : []
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
        if (normalized[0]) {
          setSelectedProductId(String(normalized[0].id || normalized[0]._id))
        }
      } catch (error) {
        console.error("Failed to load products for receipt:", error)
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

  const fields = useMemo(
    () => [
      {
        name: "quantity",
        label: t("warehouse.table.quantity"),
        type: "number",
        min: "1",
      },
    ],
    [t],
  )

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id || product._id) === selectedProductId) || null,
    [products, selectedProductId],
  )

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreate = async () => {
    const hasEmptyRequiredField = fields.some((field) => !String(form[field.name] ?? "").trim())
    const quantity = Number(form.quantity)
    const serialNumbers = form.serialNumbers
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
    const uniqueSerialCount = new Set(serialNumbers).size
    const expirationValue = Number(form.expirationValue)

    if (!selectedProduct) {
      toastWarning({
        title: t("warehouse.receipt.validationProduct", {
          defaultValue: "Выберите товар для прихода",
        }),
      })
      return
    }

    if (hasEmptyRequiredField) {
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

    const warehouse = warehouseChoices.find((item) => item.id === form.warehouse)
    const warehouseName = warehouse?.name || form.warehouse

    setIsSaving(true)
    try {
      await adjustProductStock(selectedProductId, {
        type: "receipt",
        quantity,
        warehouse_id: form.warehouse,
        warehouse: warehouseName,
        serial_numbers: serialNumbers,
        expiration_value: expirationValue,
        expiration_unit: form.expirationUnit,
        comment: [
          `${t("warehouse.receipt.fields.serialNumbers", { defaultValue: "Серийные номера" })}: ${serialNumbers.join(", ")}`,
          `${t("warehouse.receipt.fields.expirationPeriod", { defaultValue: "Срок годности" })}: ${expirationValue} ${t(`warehouse.receipt.expirationUnits.${form.expirationUnit}`, { defaultValue: form.expirationUnit })}`,
        ].filter(Boolean).join("; "),
        files: images.map((image) => image.path || image.url).filter(Boolean),
      })
      toastSuccess({ title: t("warehouse.messages.receiptSaved") })
      router.push("/dashboard/werehouses")
    } catch (error) {
      console.error("Failed to save receipt:", error)
      toastError({
        title: t("warehouse.receipt.saveError", { defaultValue: "Не удалось сохранить приход" }),
        description: error?.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.push("/dashboard/werehouses")
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-8 flex items-center gap-4">
        <BackLinkButton href="/dashboard/werehouses" />
        <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">{t("warehouse.links.receipt.title")}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_270px]">
        <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-4 shadow-[var(--surface-shadow)]">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
                {t("warehouse.receipt.fields.productName")}<span className="text-[var(--danger)]">*</span>
              </label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-[36px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)]">
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

            {fields.map((field) => (
              <div key={field.name}>
                <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
                  {field.label}<span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  value={form[field.name]}
                  type={field.type}
                  min={field.min}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  className="h-[36px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            ))}

            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
                {t("warehouse.receipt.fields.serialNumbers", { defaultValue: "Серийные номера" })}<span className="text-[var(--danger)]">*</span>
              </label>
              <textarea
                value={form.serialNumbers}
                onChange={(event) => updateField("serialNumbers", event.target.value)}
                placeholder={t("warehouse.receipt.placeholders.serialNumbers", {
                  defaultValue: "Введите каждый серийный номер с новой строки",
                })}
                className="min-h-[92px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {t("warehouse.receipt.serialHint", {
                  defaultValue: "Для каждой единицы товара нужен отдельный уникальный серийный номер.",
                })}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
                  {t("warehouse.receipt.fields.expirationPeriod", { defaultValue: "Срок годности" })}<span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  value={form.expirationValue}
                  type="number"
                  min="1"
                  onChange={(event) => updateField("expirationValue", event.target.value)}
                  className="h-[36px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
                  {t("warehouse.receipt.fields.expirationUnit", { defaultValue: "Единица" })}<span className="text-[var(--danger)]">*</span>
                </label>
                <Select value={form.expirationUnit} onValueChange={(value) => updateField("expirationUnit", value)}>
                  <SelectTrigger className="h-[36px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)]">
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
              <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">
                {t("warehouse.table.warehouse")}<span className="text-[var(--danger)]">*</span>
              </label>
              <Select value={form.warehouse} onValueChange={(value) => updateField("warehouse", value)}>
                <SelectTrigger className="h-[36px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)]">
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

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSaving}
              className="h-9 rounded-[8px] border border-[var(--accent)] bg-[var(--accent)] px-5 text-[12px] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
            >
              {t("warehouse.actions.create")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-9 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-5 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              {t("common.cancel")}
            </button>
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
