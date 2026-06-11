"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { ArrowRight, Search, SquarePen, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { adjustProductStock, getProducts, getWarehouses } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { warehouseOptions } from "@/components/warehouse/warehouse-data"
import { toastError, toastSuccess } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"
import { formatMoney, normalizeCurrencyCode, resolveLocale } from "@/lib/utils/currency"

const actionButtonClass =
  "h-[40px] w-[30px] rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-0 text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"

const normalizeProduct = (item, index, warehouses, productTypes) => {
  const stockByWarehouse = item?.stock_by_warehouse || item?.stockByWarehouse || {}
  const warehouseId =
    item?.warehouse_id ||
    item?.warehouseId ||
    Object.keys(stockByWarehouse).find((key) => Number(stockByWarehouse[key]) > 0) ||
    ""
  const warehouseFallbacks = Array.isArray(warehouses) ? warehouses : Object.values(warehouses || {})
  const warehouseLabels = Array.isArray(warehouses) ? {} : warehouses || {}
  const fallbackWarehouse = warehouseFallbacks[index % warehouseFallbacks.length] || warehouseFallbacks[0] || "Warehouse 1"

  return {
    id: String(item?.id || item?._id || index + 1),
    name: item?.name || item?.title || `PM ${index + 1}`,
    category:
      item?.category_name ||
      item?.category?.name ||
      item?.top_category_name ||
      productTypes[index % productTypes.length],
    warehouseId,
    warehouse: item?.warehouse || warehouseLabels[warehouseId] || fallbackWarehouse,
    stockByWarehouse,
    count: Number(item?.count ?? [0, 25, 20, 10, 15][index % 5] ?? 0),
    date: item?.created_at ? new Date(item.created_at).toLocaleDateString("ru-RU") : "—",
    price: Number(item?.price ?? 1500000),
    currency: normalizeCurrencyCode(item?.currency || item?.price_currency || "UZS"),
  }
}

export default function WarehouseInventoryClient({
  titleKey = "warehouse.links.stocks.title",
  showMoveAction = true,
  showWriteoffAction = true,
  headingKey = null,
  primaryAction = "details",
}) {
  const { t, i18n } = useTranslation("common")
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [search, setSearch] = useState("")
  const [moveOpen, setMoveOpen] = useState(false)
  const [writeoffOpen, setWriteoffOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState(null)
  const [moveProductId, setMoveProductId] = useState("")
  const [moveWarehouseId, setMoveWarehouseId] = useState("warehouse-5")
  const [moveQuantity, setMoveQuantity] = useState("")
  const [moveComment, setMoveComment] = useState("")
  const [writeoffProductId, setWriteoffProductId] = useState("")
  const [writeoffQuantity, setWriteoffQuantity] = useState("1")
  const [writeoffReason, setWriteoffReason] = useState("")
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search)
  const itemsPerPage = 5
  const warehouseChoices = useMemo(() => {
    if (warehouses.length > 0) return warehouses
    return warehouseOptions.map((item) => ({
      id: item.id,
      name: t(item.nameKey || "", { defaultValue: item.fallbackName || item.name || item.id }),
      is_active: true,
    }))
  }, [t, warehouses])

  const warehouseLabelsById = useMemo(
    () =>
      warehouseChoices.reduce((acc, item) => {
        acc[item.id] = t(item.nameKey || "", { defaultValue: item.fallbackName || item.name || item.id })
        return acc
      }, {}),
    [t, warehouseChoices],
  )
  const selectedMoveProduct = useMemo(
    () => products.find((item) => item.id === moveProductId) || activeProduct,
    [activeProduct, moveProductId, products],
  )
  const destinationWarehouseChoices = useMemo(
    () => warehouseChoices.filter((item) => item.id !== selectedMoveProduct?.warehouseId),
    [selectedMoveProduct?.warehouseId, warehouseChoices],
  )
  const selectedDestinationWarehouse = useMemo(
    () => warehouseChoices.find((item) => item.id === moveWarehouseId) || null,
    [moveWarehouseId, warehouseChoices],
  )
  const translatedProductTypes = useMemo(
    () =>
      ["terminal", "computer", "roller", "printer", "label"].map((key) =>
        t(`warehouse.sampleTypes.${key}`),
      ),
    [t],
  )
  const locale = useMemo(() => {
    return resolveLocale(i18n.resolvedLanguage || i18n.language)
  }, [i18n.language, i18n.resolvedLanguage])
  useEffect(() => {
    const load = async () => {
      try {
        const [response, warehouseResponse] = await Promise.all([
          getProducts({ page: 1, limit: 20 }),
          getWarehouses({ limit: 500 }),
        ])
        const warehouseItems = Array.isArray(warehouseResponse?.data)
          ? warehouseResponse.data
          : Array.isArray(warehouseResponse)
            ? warehouseResponse
            : []
        setWarehouses(
          warehouseItems
            .map((item) => ({
              id: String(item.id || item._id || ""),
              name: item.name || item.id || item._id,
              is_active: item.is_active !== false,
            }))
            .filter((item) => item.id && item.is_active),
        )
        const fallbackLabels = warehouseOptions.reduce((acc, item) => {
          acc[item.id] = t(item.nameKey || "", { defaultValue: item.fallbackName || item.name || item.id })
          return acc
        }, {})
        const labels = warehouseItems.reduce((acc, item) => {
          const id = String(item.id || item._id || "")
          if (id) acc[id] = item.name || id
          return acc
        }, fallbackLabels)
        const items = extractArrayFromResponse(response, ["products"])
        const normalized = (Array.isArray(items) ? items : []).map((item, index) =>
          normalizeProduct(item, index, labels, translatedProductTypes),
        )
        setProducts(normalized)
      } catch (error) {
        console.error("Failed to load warehouse inventory:", error)
        setProducts([])
        toastError({
          title: t("warehouse.messages.backendUnavailable.title"),
          description: t("warehouse.messages.backendUnavailable.inventoryFallback"),
        })
      }
    }

    load()
  }, [t, translatedProductTypes])

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) return products
    return products.filter((item) =>
      [item.name, item.category, item.warehouse].join(" ").toLowerCase().includes(query),
    )
  }, [deferredSearch, products])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch])

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const visiblePages = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }, [totalPages])

  const openMove = (product = null) => {
    const fallbackDestination = warehouseChoices.find((item) => item.id !== product?.warehouseId)
    setActiveProduct(product || null)
    setMoveProductId(product?.id || "")
    setMoveWarehouseId(fallbackDestination?.id || "")
    setMoveQuantity(product?.count ? String(product.count) : "")
    setMoveComment("")
    setMoveOpen(true)
  }

  const openWriteoff = (product = null) => {
    setActiveProduct(product || null)
    setWriteoffProductId(product?.id || "")
    setWriteoffQuantity(product?.count > 0 ? "1" : "0")
    setWriteoffReason("")
    setWriteoffOpen(true)
  }

  const confirmWriteoff = async () => {
    const selectedProduct = products.find((item) => item.id === writeoffProductId) || activeProduct
    const quantity = Number(writeoffQuantity)
    const available = Number(selectedProduct?.count ?? 0)

    if (!selectedProduct) {
      toastError({ title: t("warehouse.dialogs.move.errors.product") })
      return
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toastError({ title: t("warehouse.dialogs.writeoff.errors.quantity") })
      return
    }

    if (quantity > available) {
      toastError({
        title: t("warehouse.dialogs.writeoff.errors.stock"),
        description: t("warehouse.dialogs.writeoff.errors.stockDescription", { count: available }),
      })
      return
    }

    if (!writeoffReason.trim()) {
      toastError({ title: t("warehouse.dialogs.writeoff.errors.reason") })
      return
    }

    const nextCount = Math.max(0, available - quantity)
    const isPersistableProduct = /^[a-f0-9]{24}$/i.test(String(selectedProduct?.id || ""))

    if (isPersistableProduct) {
      try {
        const updatedProduct = await adjustProductStock(selectedProduct.id, {
          type: "writeoff",
          quantity,
          source_warehouse_id: selectedProduct.warehouseId,
          source_warehouse: selectedProduct.warehouse,
          reason: writeoffReason.trim(),
        })
        const normalized = normalizeProduct(updatedProduct?.data || updatedProduct, 0, warehouseLabelsById, translatedProductTypes)
        setProducts((prev) =>
          prev.map((product) =>
            product.id === selectedProduct?.id ? { ...product, ...normalized } : product,
          ),
        )
      } catch (error) {
        console.error("Failed to persist write-off:", error)
        toastError({
          title: t("warehouse.dialogs.writeoff.errors.save"),
          description: error?.message,
        })
        return
      }
    } else {
      setProducts((prev) =>
        prev.map((product) =>
          product.id === selectedProduct?.id
            ? { ...product, count: nextCount }
            : product,
        ),
      )
    }
    setWriteoffOpen(false)
    toastSuccess({
      title: t("warehouse.messages.writeoffSuccess.title"),
      description: selectedProduct
        ? t("warehouse.messages.writeoffSuccess.description", {
            product: selectedProduct.name,
            count: quantity,
          })
        : t("warehouse.messages.actionCompleted"),
    })
  }

  const handleWriteoffProductChange = (productId) => {
    const product = products.find((item) => item.id === productId) || null
    setWriteoffProductId(productId)
    setActiveProduct(product)
    setWriteoffQuantity(product?.count > 0 ? "1" : "0")
  }

  const handleMoveProductChange = (productId) => {
    const product = products.find((item) => item.id === productId) || null
    const fallbackDestination = warehouseChoices.find((item) => item.id !== product?.warehouseId)
    setMoveProductId(productId)
    setActiveProduct(product)
    setMoveQuantity(product?.count ? String(product.count) : "")
    setMoveWarehouseId(fallbackDestination?.id || "")
  }

  const confirmMove = () => {
    const selectedProduct = products.find((item) => item.id === moveProductId) || activeProduct
    const quantity = Number(moveQuantity)

    if (!selectedProduct) {
      toastError({ title: t("warehouse.dialogs.move.errors.product") })
      return
    }

    if (!moveWarehouseId) {
      toastError({ title: t("warehouse.dialogs.move.errors.warehouse") })
      return
    }

    if (moveWarehouseId === selectedProduct.warehouseId) {
      toastError({ title: t("warehouse.dialogs.move.errors.sameWarehouse") })
      return
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toastError({ title: t("warehouse.dialogs.move.errors.quantity") })
      return
    }

    if (quantity > Number(selectedProduct.count ?? 0)) {
      toastError({
        title: t("warehouse.dialogs.writeoff.errors.stock"),
        description: t("warehouse.dialogs.writeoff.errors.stockDescription", { count: selectedProduct.count ?? 0 }),
      })
      return
    }

    const destination = warehouseChoices.find((item) => item.id === moveWarehouseId)
    const destinationName = destination?.name || moveWarehouseId
    const isPersistableProduct = /^[a-f0-9]{24}$/i.test(String(selectedProduct?.id || ""))

    if (isPersistableProduct) {
      adjustProductStock(selectedProduct.id, {
        type: "movement",
        quantity,
        source_warehouse_id: selectedProduct.warehouseId,
        source_warehouse: selectedProduct.warehouse,
        warehouse_id: moveWarehouseId,
        warehouse: destinationName,
        comment: moveComment.trim(),
      })
        .then((updatedProduct) => {
          const normalized = normalizeProduct(updatedProduct?.data || updatedProduct, 0, warehouseLabelsById, translatedProductTypes)
          setProducts((prev) =>
            prev.map((product) =>
              product.id === selectedProduct.id ? { ...product, ...normalized } : product,
            ),
          )
          setMoveOpen(false)
          toastSuccess({
            title: t("warehouse.messages.moveSuccess.title"),
            description: t("warehouse.messages.moveSuccess.description", { product: selectedProduct.name }),
          })
        })
        .catch((error) => {
          console.error("Failed to persist movement:", error)
          toastError({
            title: t("warehouse.dialogs.move.errors.save", { defaultValue: "Не удалось сохранить перемещение" }),
            description: error?.message,
          })
        })
      return
    }

    setProducts((prev) =>
      prev.map((product) =>
        product.id === selectedProduct.id
          ? { ...product, warehouseId: moveWarehouseId, warehouse: destinationName }
          : product,
      ),
    )
    setMoveOpen(false)
    toastSuccess({
      title: t("warehouse.messages.moveSuccess.title"),
      description: selectedProduct
        ? t("warehouse.messages.moveSuccess.description", { product: selectedProduct.name })
        : t("warehouse.messages.actionCompleted"),
    })
  }

  const handlePrimaryAction = (product) => {
    if (primaryAction === "move") {
      openMove(product)
      return
    }

    if (primaryAction === "writeoff") {
      openWriteoff(product)
      return
    }

    router.push(`/dashboard/products/${product.id}?type=show`)
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-6 flex items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <BackLinkButton href="/dashboard/werehouses" />
            <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">{t(titleKey)}</h1>
          </div>
          {headingKey && <p className="mt-6 text-[16px] text-[var(--text-primary)]">{t(headingKey)}</p>}
        </div>
        <div className="flex w-full max-w-[520px] items-center justify-end gap-3">
          <div className="relative w-full max-w-[305px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("table.searchPlaceholder")}
              className="h-[36px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface-elevated)] pl-9 text-[12px]"
            />
          </div>
          {primaryAction === "move" && (
            <Button
              type="button"
              onClick={() => openMove()}
              disabled={products.length === 0}
              className="h-[36px] min-w-[190px] rounded-[8px] bg-[var(--surface-elevated)] px-4 text-[12px] font-medium text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border-default)] hover:bg-[var(--surface-hover)]"
            >
              {t("warehouse.actions.createMovement")}
            </Button>
          )}
          {primaryAction === "writeoff" && (
            <Button
              type="button"
              onClick={() => openWriteoff()}
              disabled={products.length === 0}
              className="h-[36px] min-w-[174px] rounded-[8px] bg-[var(--surface-elevated)] px-4 text-[12px] font-medium text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border-default)] hover:bg-[var(--surface-hover)]"
            >
              {t("warehouse.actions.createWriteoff", { defaultValue: "Создать списание" })}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <div className="overflow-x-auto px-3 pt-3">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[12px] text-[var(--text-primary)]">
            <thead>
              <tr className="text-[var(--text-secondary)]">
                <th className="border-b border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-left font-normal">#</th>
                <th className="border-b border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-left font-normal">{t("products.columns.name")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-left font-normal">{t("products.columns.type")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-left font-normal">{t("warehouse.table.warehouse")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-left font-normal">{t("warehouse.table.quantity")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-left font-normal">{t("products.columns.dateAdded")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-left font-normal">{t("products.columns.price")}</th>
                <th className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-left font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[var(--text-secondary)]">
                    {t("warehouse.table.emptyProducts")}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product, index) => (
                  <tr key={product.id} className={index % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-elevated)]"}>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{(page - 1) * itemsPerPage + index + 1}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.name}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.category}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.warehouse}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.count}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.date}</td>
                    <td className="border-r border-[var(--border-subtle)] px-4 py-4">{formatMoney(product.price, product.currency, locale)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className={actionButtonClass}
                          onClick={() => handlePrimaryAction(product)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        {showMoveAction && (
                          <Button variant="ghost" className={actionButtonClass} onClick={() => openMove(product)}>
                            <SquarePen className="h-4 w-4" />
                          </Button>
                        )}
                        {showWriteoffAction && (
                          <Button variant="ghost" className={actionButtonClass} onClick={() => openWriteoff(product)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[var(--text-secondary)]">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 text-[16px] font-semibold leading-none transition-colors ${
              page === 1
                ? "border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-muted)]"
                : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            ‹
          </button>
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 text-[13px] font-medium transition-colors ${
                pageNumber === page
                  ? "border-[var(--accent)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                  : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
            className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 text-[16px] font-semibold leading-none transition-colors ${
              page === totalPages
                ? "border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-muted)]"
                : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            ›
          </button>
          <div className="ml-4 flex h-8 w-[105px] items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[var(--text-primary)]">
            {itemsPerPage}
          </div>
          <span>/{t("table.pageLabel")}</span>
        </div>
      </div>

      <Dialog open={writeoffOpen} onOpenChange={setWriteoffOpen}>
        <DialogContent className="w-[min(560px,calc(100vw-32px))] max-w-none rounded-[16px] border border-[var(--border-default)] bg-[var(--surface)] p-0 shadow-[var(--surface-shadow)]">
          <div className="max-h-[calc(100vh-64px)] overflow-y-auto p-8">
            <DialogHeader className="text-left">
              <DialogTitle className="text-[28px] font-normal text-[var(--text-primary)]">{t("warehouse.dialogs.writeoff.title")}</DialogTitle>
              <DialogDescription className="text-[13px] text-[var(--text-secondary)]">
                {t("warehouse.dialogs.writeoff.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">
                  {t("warehouse.dialogs.writeoff.fields.product")}
                </label>
                <Select value={writeoffProductId} onValueChange={handleWriteoffProductChange}>
                  <SelectTrigger className="h-10 rounded-[8px] text-[13px]">
                    <SelectValue placeholder={t("warehouse.dialogs.move.placeholders.product")} />
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
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">
                  {t("warehouse.dialogs.writeoff.fields.available")}
                </label>
                <Input value={String(activeProduct?.count ?? 0)} readOnly className="h-10 rounded-[8px] text-[13px]" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">
                  {t("warehouse.dialogs.writeoff.fields.quantity")}<span className="text-[var(--danger)]">*</span>
                </label>
                <Input
                  value={writeoffQuantity}
                  type="number"
                  min="1"
                  max={activeProduct?.count ?? undefined}
                  onChange={(event) => setWriteoffQuantity(event.target.value)}
                  className="h-10 rounded-[8px] text-[13px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">
                  {t("warehouse.dialogs.writeoff.fields.reason")}<span className="text-[var(--danger)]">*</span>
                </label>
                <Textarea
                  value={writeoffReason}
                  onChange={(event) => setWriteoffReason(event.target.value)}
                  placeholder={t("warehouse.dialogs.writeoff.placeholders.reason")}
                  className="min-h-[92px] rounded-[8px] text-[13px]"
                />
              </div>
            </div>
            <div className="mt-8 flex items-center justify-end gap-3">
              <Button variant="outline" className="h-10 px-6 text-[12px]" onClick={() => setWriteoffOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button className="h-10 min-w-[148px] rounded-[8px] text-[12px]" onClick={confirmWriteoff}>
                {t("warehouse.dialogs.writeoff.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-[760px] rounded-[18px] border border-[var(--border-default)] bg-[var(--surface)] p-0 shadow-[var(--surface-shadow)]">
          <div className="p-7">
            <DialogHeader className="text-left">
              <DialogTitle className="text-[32px] font-normal text-[var(--text-primary)]">{t("warehouse.dialogs.move.title")}</DialogTitle>
              <DialogDescription className="text-[13px] text-[var(--text-secondary)]">
                {t("warehouse.dialogs.move.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">{t("warehouse.dialogs.move.fields.responsible")}</label>
                <Input
                  value={t("warehouse.dialogs.move.defaults.responsible")}
                  readOnly
                  className="h-[36px] rounded-[8px] border-[#e5e8ee] text-[12px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">{t("warehouse.dialogs.move.fields.productName")}<span className="text-[var(--danger)]">*</span></label>
                <Select value={moveProductId} onValueChange={handleMoveProductChange}>
                  <SelectTrigger className="h-[36px] rounded-[8px] border-[#e5e8ee] text-[12px]">
                    <SelectValue placeholder={t("warehouse.dialogs.move.placeholders.product")} />
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
              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">{t("warehouse.dialogs.move.fields.fromWarehouse")}</label>
                  <div className="min-h-[44px] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2">
                    <p className="text-[12px] font-medium text-[var(--text-primary)]">
                      {selectedMoveProduct?.warehouse || t("warehouse.dialogs.move.placeholders.sourceWarehouse")}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      {t("warehouse.dialogs.move.available", { count: selectedMoveProduct?.count ?? 0 })}
                    </p>
                  </div>
                </div>
                <div className="hidden h-[44px] items-center justify-center text-[var(--text-secondary)] md:flex">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">{t("warehouse.dialogs.move.fields.toWarehouse")}<span className="text-[var(--danger)]">*</span></label>
                <Select value={moveWarehouseId} onValueChange={setMoveWarehouseId}>
                  <SelectTrigger className="h-[36px] rounded-[8px] border-[#e5e8ee] text-[12px]">
                    <SelectValue placeholder={t("warehouse.dialogs.move.placeholders.destinationWarehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationWarehouseChoices.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name || item.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">{t("warehouse.dialogs.move.fields.quantity")}<span className="text-[var(--danger)]">*</span></label>
                <Input
                  type="number"
                  min="1"
                  max={activeProduct?.count ?? undefined}
                  value={moveQuantity}
                  onChange={(event) => setMoveQuantity(event.target.value)}
                  placeholder={activeProduct ? String(activeProduct.count) : t("warehouse.dialogs.move.placeholders.quantity")}
                  className="h-[36px] rounded-[8px] border-[#e5e8ee] text-[12px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">{t("warehouse.dialogs.move.fields.comments")}</label>
                <Textarea
                  value={moveComment}
                  onChange={(event) => setMoveComment(event.target.value)}
                  placeholder={t("warehouse.dialogs.move.placeholders.comments")}
                  className="min-h-[92px] rounded-[8px] border-[#e5e8ee] text-[12px]"
                />
              </div>
              {selectedMoveProduct && selectedDestinationWarehouse && (
                <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4">
                  <p className="text-[11px] uppercase text-[var(--text-secondary)]">{t("warehouse.dialogs.move.summaryTitle")}</p>
                  <p className="mt-2 text-[14px] font-medium text-[var(--text-primary)]">
                    {selectedMoveProduct.warehouse} → {selectedDestinationWarehouse.name || selectedDestinationWarehouse.id}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                    {selectedMoveProduct.name} · {t("warehouse.dialogs.move.quantitySummary", { count: moveQuantity || 0 })}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-7 flex items-center justify-end gap-4">
              <Button variant="outline" className="h-10 px-6 text-[12px]" onClick={() => setMoveOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button className="h-10 min-w-[148px] rounded-[8px] text-[12px]" onClick={confirmMove}>
                {t("warehouse.dialogs.move.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
