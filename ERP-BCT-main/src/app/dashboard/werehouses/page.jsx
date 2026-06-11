"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, SquarePen } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getProducts, getWarehouses } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { warehouseLinks, warehouseOptions } from "@/components/warehouse/warehouse-data"
import { toastError } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"
import { formatMoney, normalizeCurrencyCode, resolveLocale } from "@/lib/utils/currency"

const formatDate = (value, locale) => {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

const normalizeStockByWarehouse = (stockByWarehouse) => {
  if (!stockByWarehouse || typeof stockByWarehouse !== "object") return {}

  return Object.fromEntries(
    Object.entries(stockByWarehouse)
      .map(([warehouseId, value]) => [warehouseId, Number(value || 0)])
      .filter(([warehouseId]) => Boolean(warehouseId)),
  )
}

const resolveWarehouseId = (item, stockByWarehouse) => {
  if (item?.warehouse_id || item?.warehouseId) {
    return item.warehouse_id || item.warehouseId
  }

  const firstWarehouseWithStock = Object.entries(stockByWarehouse).find(([, value]) => value > 0)
  return firstWarehouseWithStock?.[0] || Object.keys(stockByWarehouse)[0] || ""
}

const normalizeProduct = (item, index, warehouseLabels, productTypes, locale) => {
  const stockByWarehouse = normalizeStockByWarehouse(item?.stock_by_warehouse || item?.stockByWarehouse)
  const warehouseId = resolveWarehouseId(item, stockByWarehouse)

  return {
    id: String(item?.id || item?._id || index + 1),
    name: item?.name || item?.title || `PM ${index + 1}`,
    type:
      item?.category_name ||
      item?.category?.name ||
      productTypes[index % productTypes.length],
    warehouse: item?.warehouse || warehouseLabels[warehouseId] || warehouseLabels["warehouse-1"] || "",
    count: Number(item?.count ?? Object.values(stockByWarehouse).reduce((sum, value) => sum + value, 0)),
    date: formatDate(item?.created_at || item?.createdAt || item?.date || item?.updated_at || item?.updatedAt, locale),
    price: Number(item?.price ?? 0),
    currency: normalizeCurrencyCode(item?.currency || item?.price_currency || "UZS"),
  }
}

export default function WerehousePage() {
  const { t, i18n } = useTranslation("common")
  const [products, setProducts] = useState([])
  const [page, setPage] = useState(1)
  const itemsPerPage = 5
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
          getProducts({ page: 1, limit: 10 }),
          getWarehouses({ limit: 500 }),
        ])
        const warehouseItems = Array.isArray(warehouseResponse?.data)
          ? warehouseResponse.data
          : Array.isArray(warehouseResponse)
            ? warehouseResponse
            : []
        const labels = warehouseOptions.reduce((acc, item) => {
          acc[item.id] = t(item.nameKey || "", { defaultValue: item.fallbackName || item.name || item.id })
          return acc
        }, {})
        warehouseItems.forEach((item) => {
          const id = String(item.id || item._id || "")
          if (id) labels[id] = item.name || id
        })
        const items = extractArrayFromResponse(response, ["products"])
        const normalized = (Array.isArray(items) ? items : []).map((item, index) =>
          normalizeProduct(item, index, labels, translatedProductTypes, locale),
        )
        setProducts(normalized)
      } catch (error) {
        console.error("Failed to load warehouse products:", error)
        setProducts([])
        toastError({
          title: t("warehouse.messages.backendUnavailable.title"),
          description: t("warehouse.messages.backendUnavailable.homeFallback"),
        })
      }
    }

    load()
  }, [locale, t, translatedProductTypes])

  const totalPages = Math.max(1, Math.ceil(products.length / itemsPerPage))

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return products.slice(start, start + itemsPerPage)
  }, [page, products])

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const visiblePages = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }, [totalPages])

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-8 flex min-w-0 items-center gap-4">
        <BackLinkButton href="/dashboard" />
        <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
          {t("warehouse.pageTitle")}
        </h1>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {warehouseLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[12px] bg-[var(--menu-card)] px-4 py-5 text-white shadow-[0_8px_20px_rgba(25,28,38,0.06)] transition hover:-translate-y-0.5 hover:bg-[var(--menu-card-hover)]"
          >
            <div className="text-[30px] leading-none"> </div>
            <h2 className="mt-2 text-[27px] font-normal tracking-[-0.03em]">{t(item.titleKey)}</h2>
            <p className="mt-1 text-[12px] text-white/82">{t(item.subtitleKey)}</p>
          </Link>
        ))}
      </div>

      <h2 className="mb-5 text-[24px] font-normal text-[var(--text-primary)]">{t("warehouse.recentProducts")}</h2>

      <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <div className="overflow-x-auto px-3 pt-3">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[12px] text-[var(--text-primary)]">
            <thead>
              <tr className="text-[var(--text-secondary)]">
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">#</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("products.columns.name")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("products.columns.type")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.table.warehouse")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("warehouse.table.quantity")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("products.columns.dateAdded")}</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-4 text-left font-normal">{t("products.columns.price")}</th>
                <th className="border-b border-[var(--border-subtle)] px-4 py-4 text-left font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product, index) => (
                <tr key={product.id} className={index % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-elevated)]"}>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{(page - 1) * itemsPerPage + index + 1}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.name}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.type}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.warehouse}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.count}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{product.date}</td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-4">{formatMoney(product.price, product.currency, locale)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/products/${product.id}?type=show`} className="flex h-[40px] w-[32px] items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-hover)]">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link href={`/dashboard/products/${product.id}?type=edit`} className="flex h-[40px] w-[32px] items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-hover)]">
                        <SquarePen className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-[var(--text-secondary)]"
                  >
                    {t("table.noDataFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[var(--text-secondary)]">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            aria-label={t("table.previousPage")}
            className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 text-[18px] font-semibold leading-none transition ${page === 1 ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-muted)] opacity-60" : "cursor-pointer border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"}`}
          >
            ‹
          </button>
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 text-[12px] transition ${
                pageNumber === page ? "border-[var(--accent)] bg-[var(--surface-elevated)] text-[var(--text-primary)]" : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
            aria-label={t("table.nextPage")}
            className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 text-[18px] font-semibold leading-none transition ${page === totalPages ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-muted)] opacity-60" : "cursor-pointer border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"}`}
          >
            ›
          </button>
          <div className="ml-4 flex h-8 w-[105px] items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[var(--text-primary)]">
            {itemsPerPage}
          </div>
          <span>/{t("table.pageLabel", { defaultValue: "Page" })}</span>
        </div>
      </div>
    </div>
  )
}
