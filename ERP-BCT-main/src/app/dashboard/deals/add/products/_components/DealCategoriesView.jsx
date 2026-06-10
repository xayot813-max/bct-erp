"use client"

import Image from "next/image"
import Link from "next/link"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import BackLinkButton from "@/components/shared/BackLinkButton"

export default function DealCategoriesView({ categories, querySuffix, backHref }) {
  const { t } = useTranslation("common")
  return (
    <div className="mx-auto flex w-[95%] max-w-[1240px] flex-col gap-7">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <BackLinkButton href={backHref} />
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

      {categories.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[var(--border-default)] bg-[var(--surface)] p-12 text-center text-[var(--text-secondary)] shadow-[var(--surface-shadow)]">
          {t("dealCategories.empty")}
        </div>
      ) : (
        <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => {
            const name =
              category.name || t("dealCategories.fallbackName", { index: category.index })

            return (
              <Link
                key={category.id}
                href={`/dashboard/deals/add/products/${encodeURIComponent(category.id)}${querySuffix}`}
                className="group flex h-[165px] flex-col items-center justify-center rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-4 shadow-[var(--surface-shadow)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--surface-hover)]"
              >
                <div className="relative h-[92px] w-full">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={name}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--text-muted)]">
                      {t("dealCategories.noImage")}
                    </div>
                  )}
                </div>
                <h2 className="mt-4 text-center text-[13px] font-medium text-[var(--text-primary)]">{name}</h2>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
