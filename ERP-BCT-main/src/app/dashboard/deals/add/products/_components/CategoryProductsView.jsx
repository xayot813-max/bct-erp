"use client"

import Image from "next/image"
import Link from "next/link"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import BackLinkButton from "@/components/shared/BackLinkButton"

export default function CategoryProductsView({ category, products, querySuffix }) {
  const { t } = useTranslation("common")
  return (
    <div className="mx-auto flex w-[95%] max-w-[1240px] flex-col gap-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackLinkButton href={`/dashboard/deals/add/products${querySuffix || ""}`} />
          <h1 className="text-[34px] font-normal leading-tight text-[var(--text-primary)]">{t("productsPage.title")}</h1>
        </div>
        <div className="relative w-full max-w-[400px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="h-10 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] pl-9 pr-3 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
            placeholder={t("dealProducts.searchPlaceholder", { defaultValue: "Search products" })}
          />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[var(--border-default)] bg-[var(--surface)] p-12 text-center text-[var(--text-secondary)] shadow-[var(--surface-shadow)]">
          {t("dealProducts.empty")}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const name =
              product.name || t("dealProducts.fallbackName", { index: product.index })
            const description = product.description

            return (
              <Link
                key={product.id}
                href={`/dashboard/deals/add/products/${encodeURIComponent(category.id)}/${encodeURIComponent(product.id)}${querySuffix}`}
                className="grid min-h-[155px] grid-cols-[1fr_120px] gap-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-6 shadow-[var(--surface-shadow)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--surface-hover)]"
              >
                <div className="flex flex-col justify-between">
                  <div>
                    <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">{name}</h2>
                    <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-[var(--text-secondary)]">
                      {description || t("dealProducts.noDescription")}
                    </p>
                  </div>
                  <span className="mt-3 inline-flex h-8 w-[120px] items-center justify-center rounded-[8px] bg-[var(--primary)] text-[12px] text-[var(--accent-foreground)]">
                    {t("dealAdd.products.add")}
                  </span>
                </div>
                <div className="relative h-[130px] w-full">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={name}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--text-muted)]">
                      {t("dealProducts.noImage")}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
