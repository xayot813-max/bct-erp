"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useDealStore, type DealProduct } from "@/store/dealStore"
import { formatMoney, resolveLocale } from "@/lib/utils/currency"

const calculateTotals = (product: DealProduct) => {
  const subtotal = product.price * product.quantity
  const vatAmount = subtotal * (product.vat / 100)
  const discountAmount = subtotal * (product.discount / 100)
  const total = subtotal + vatAmount - discountAmount

  return { subtotal, vatAmount, discountAmount, total }
}

export default function DealTable() {
  const { t, i18n } = useTranslation("common")
  const products = useDealStore((state) => state.dealProducts)
  const currency = useDealStore((state) => state.formData.currency)
  const locale = useMemo(() => {
    return resolveLocale(i18n.resolvedLanguage || i18n.language)
  }, [i18n.language, i18n.resolvedLanguage])

  const summary = useMemo(() => {
    return products.reduce(
      (acc, item) => {
        const totals = calculateTotals(item)
        acc.total += totals.total
        acc.quantity += item.quantity
        return acc
      },
      { quantity: 0, total: 0 },
    )
  }, [products])

  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
      <div className="min-h-[248px] overflow-auto px-5 pt-4">
        <table className="min-w-[850px] w-full border-separate border-spacing-0 text-[10px] text-[var(--text-primary)]">
          <thead>
            <tr className="text-[var(--text-secondary)]">
              <th className="px-3 py-3 text-left font-medium">{t("deal.table.barcode", { defaultValue: "Barcode" })}</th>
              <th className="px-3 py-3 text-left font-medium">{t("deal.table.name", { defaultValue: "Name" })}</th>
              <th className="px-3 py-3 text-left font-medium">{t("deal.table.quantity", { defaultValue: "Quantity" })}</th>
              <th className="px-3 py-3 text-left font-medium">{t("deal.table.accepted", { defaultValue: "Accepted" })}</th>
              <th className="px-3 py-3 text-left font-medium">{t("deal.table.available", { defaultValue: "Available" })}</th>
              <th className="px-3 py-3 text-left font-medium">{t("deal.table.amountWithoutVat", { defaultValue: "Amount without VAT" })}</th>
              <th className="px-3 py-3 text-left font-medium">{t("deal.table.amountWithVat", { defaultValue: "Amount with VAT" })}</th>
              <th className="px-3 py-3 text-left font-medium">{t("deal.table.discount", { defaultValue: "Discount" })}</th>
              <th className="px-3 py-3 text-left font-medium">{t("deal.table.amount", { defaultValue: "Amount" })}</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-[12px] text-[var(--text-secondary)]">
                  {t("deal.table.empty", { defaultValue: "Add a product manually or by barcode" })}
                </td>
              </tr>
            ) : (
              products.map((product, index) => {
                const { subtotal, vatAmount, discountAmount, total } = calculateTotals(product)
                return (
                  <tr key={product.uid} className={index % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-elevated)]"}>
                    <td className="rounded-l-md px-3 py-3">{product.serialNumber || "-"}</td>
                    <td className="px-3 py-3 font-medium">{product.name}</td>
                    <td className="px-3 py-3">{product.quantity}{t("deal.table.quantitySuffix", { defaultValue: " pcs" })}</td>
                    <td className="px-3 py-3">0</td>
                    <td className="px-3 py-3">120</td>
                    <td className="px-3 py-3">{formatMoney(subtotal, currency, locale)}</td>
                    <td className="px-3 py-3">{formatMoney(subtotal + vatAmount, currency, locale)}</td>
                    <td className="px-3 py-3">{formatMoney(discountAmount, currency, locale)} / {product.discount}%</td>
                    <td className="rounded-r-md px-3 py-3 font-semibold">{formatMoney(total, currency, locale)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {products.length > 0 && (
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-5 py-3 text-[11px] text-[var(--text-secondary)]">
          <span>{summary.quantity} {t("deal.table.productsInContract", { defaultValue: "products in contract" })}</span>
          <strong className="text-[var(--text-primary)]">{formatMoney(summary.total, currency, locale)}</strong>
        </div>
      )}
    </div>
  )
}
