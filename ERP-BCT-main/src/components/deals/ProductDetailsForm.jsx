"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, ScanBarcode } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useDealStore } from "@/store/dealStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toastError, toastSuccess } from "@/lib/toast"
import { formatUSD } from "@/lib/utils/currency"

const clampQuantity = (value, min = 1, max = Number.POSITIVE_INFINITY) => {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

export default function ProductDetailsForm({
  product,
  mode = "default",
  onAdded,
  onCancel,
  returnTo = "/dashboard/deals/add",
  cancelTo = undefined,
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const addProductToDeal = useDealStore((state) => state.addProductToDeal)

  const [quantity, setQuantity] = useState(1)
  const [serialNumber, setSerialNumber] = useState(product.serialNumber || "")
  const [guarantee, setGuarantee] = useState(product.guarantee || "")
  const [comment, setComment] = useState("")
  const [isSubmitting, startTransition] = useTransition()

  const maxAvailable = useMemo(() => {
    if (!Number.isFinite(product.count)) return undefined
    return product.count
  }, [product.count])

  const handleAdd = () => {
    if (!product.id) {
      toastError({
        title: "Невозможно добавить товар",
        description: "Не удалось определить товар. Попробуйте снова.",
      })
      return
    }

    startTransition(() => {
      addProductToDeal({
        id: product.id,
        name: product.name,
        price: product.price,
        vat: product.vat ?? 0,
        discount: product.discount ?? 0,
        guarantee: guarantee || product.guarantee || "",
        quantity,
        serialNumber: serialNumber || product.serialNumber || "",
      })

      toastSuccess({
        title: "Товар добавлен в сделку",
        description: `${product.name} × ${quantity}`,
      })

      if (onAdded) {
        onAdded()
        return
      }

      if (returnTo) {
        router.push(returnTo)
        return
      }

      router.push("/dashboard/deals/add")
    })
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
      return
    }

    if (cancelTo) {
      router.push(cancelTo)
      return
    }

    if (returnTo) {
      router.push(returnTo)
      return
    }

    router.push("/dashboard/deals/add/products")
  }

  const quantityLabel = maxAvailable
    ? t("dealProduct.inStock", { count: maxAvailable })
    : t("dealProduct.stockUnknown")

  return (
    <section className="grid w-full gap-8 lg:grid-cols-[330px_250px_1fr] lg:items-start">
      <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] px-4 py-5 shadow-[var(--surface-shadow)]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-[var(--text-primary)]">{t("dealProduct.fields.product")}<span className="text-[var(--danger)]">*</span></label>
            <Input value={product.name} readOnly className="h-11 rounded-[10px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[14px] text-[var(--text-primary)]" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-[var(--text-primary)]">{t("dealProduct.fields.serialNumber")}<span className="text-[var(--danger)]">*</span></label>
            <Input
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              placeholder={t("dealProduct.placeholders.serialNumber")}
              className="h-11 rounded-[10px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-[var(--text-primary)]">{t("dealProduct.fields.guarantee")}<span className="text-[var(--danger)]">*</span></label>
            <Input
              value={guarantee}
              onChange={(event) => setGuarantee(event.target.value)}
              placeholder={t("dealProduct.placeholders.guarantee")}
              className="h-11 rounded-[10px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          {mode === "barcode" && (
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[var(--text-primary)]">{t("dealProduct.fields.comment")}</label>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t("dealProduct.placeholders.comment")}
                className="min-h-[96px] rounded-[10px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-[var(--text-primary)]">{t("dealProduct.fields.quantity")}<span className="text-[var(--danger)]">*</span></label>
            <Input value={`${quantity} шт. в складе`} readOnly className="h-11 rounded-[10px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[14px] text-[var(--text-primary)]" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
          <div className="mb-3 flex items-center justify-between text-[13px] text-[var(--text-primary)]">
            <span className="font-medium">{product.name}</span>
            <span>{formatUSD(product.price)}</span>
          </div>
          <div className="grid h-10 grid-cols-3 overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)]">
            <button type="button" onClick={() => setQuantity((prev) => clampQuantity(prev - 1, 1, maxAvailable ?? Number.POSITIVE_INFINITY))} className="flex items-center justify-center transition hover:bg-[var(--surface-hover)]">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center justify-center text-[14px] font-semibold">{quantity}</div>
            <button type="button" onClick={() => setQuantity((prev) => clampQuantity(prev + 1, 1, maxAvailable ?? Number.POSITIVE_INFINITY))} className="flex items-center justify-center transition hover:bg-[var(--surface-hover)]">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-secondary)]">{quantityLabel}</p>
        </div>

        <div className="space-y-2">
          <Button
            className="h-11 w-full gap-2 rounded-[10px] bg-[var(--primary)] text-[13px] font-medium text-[var(--accent-foreground)] hover:bg-[var(--primary-hover)]"
            onClick={handleAdd}
            disabled={isSubmitting || !serialNumber || !guarantee}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("dealProduct.actions.add")}
          </Button>
          <Button
            className="h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {t("dealProduct.actions.cancel")}
          </Button>
        </div>
      </div>

      {mode === "barcode" && (
        <div className="flex min-h-[150px] flex-col items-center justify-start pt-2 text-center text-[var(--text-primary)]">
          <ScanBarcode className="h-20 w-20 stroke-[1.7]" />
          <p className="mt-3 text-[26px] font-normal">{t("dealProduct.actions.scan")}</p>
        </div>
      )}
    </section>
  );
}
