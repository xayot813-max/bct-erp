"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import { useTranslation } from "react-i18next"

import { searchProductsByBarcode } from "@/app/dashboard/deals/add/barcode/actions"
import ProductDetailsForm from "@/components/deals/ProductDetailsForm"
import BackLinkButton from "@/components/shared/BackLinkButton"
import { Input } from "@/components/ui/input"

const initialState = { items: [], error: null }

export default function BarcodeProductSelector({ returnTo: explicitReturnTo }) {
  const { t } = useTranslation("common")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState(searchProductsByBarcode, initialState)
  const [selectedProductId, setSelectedProductId] = useState("")

  const selectedProduct = useMemo(() => {
    if (!state.items || state.items.length === 0) return null
    const fallback = state.items[0]
    return state.items.find((item) => item.id === selectedProductId) || fallback
  }, [state.items, selectedProductId])

  useEffect(() => {
    if (state.items && state.items.length > 0) {
      setSelectedProductId(state.items[0].id)
    } else {
      setSelectedProductId("")
    }
  }, [state.items])

  const returnTo = explicitReturnTo || searchParams.get("returnTo") || "/dashboard/deals/add"

  return (
    <div className="min-h-screen bg-[var(--background-primary)] py-5">
      <div className="mx-auto flex w-[95%] max-w-[1240px] flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackLinkButton href={returnTo} />
            <h1 className="text-[34px] font-normal leading-tight text-[var(--text-primary)]">{t("barcode.title", { defaultValue: "Product by barcode" })}</h1>
          </div>
        </div>

        <form
          action={formAction}
          className="flex w-full max-w-[360px] flex-col gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] px-4 py-5 shadow-[var(--surface-shadow)]"
        >
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-[var(--text-primary)]">{t("barcode.fieldLabel", { defaultValue: "Barcode" })}<span className="text-[var(--danger)]">*</span></label>
            <Input
              name="barcode"
              placeholder={t("barcode.placeholder", { defaultValue: "Enter or scan the barcode" })}
              className="h-11 rounded-[10px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-[10px] bg-[var(--primary)] text-[13px] font-medium text-[var(--accent-foreground)] transition hover:bg-[var(--primary-hover)]"
            disabled={pending}
          >
            {pending ? t("barcode.searching", { defaultValue: "Searching..." }) : t("barcode.find", { defaultValue: "Find" })}
          </button>
        </form>

        {state.error && (
          <div className="rounded-[12px] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] p-4 text-sm text-[var(--danger)]">
            {state.error}
          </div>
        )}

        {state.items && state.items.length > 0 && selectedProduct && (
          <div className="flex flex-col gap-8">
            {state.items.length > 1 && (
              <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-4 shadow-[var(--surface-shadow)]">
                <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">{t("barcode.foundProducts", { defaultValue: "Found products" })}</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {state.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`rounded-[10px] border px-4 py-2 text-[13px] transition ${
                        selectedProductId === item.id
                          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--accent-foreground)]"
                          : "border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--text-primary)]"
                      }`}
                      onClick={() => setSelectedProductId(item.id)}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ProductDetailsForm
              product={selectedProduct}
              mode="barcode"
              onAdded={() => router.push(returnTo)}
              onCancel={() => router.push(returnTo)}
              returnTo={returnTo}
            />
          </div>
        )}
      </div>
    </div>
  )
}
