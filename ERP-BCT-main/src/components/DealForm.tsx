"use client"

import { FormEvent, ReactNode, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { CalendarDays, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useDealStore, type DealFormData } from "@/store/dealStore"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatMoney } from "@/lib/utils/currency"

type DealFormProps = {
  onSubmit?: (values: DealFormData) => Promise<void> | void
  onCancel?: () => void
  isSubmitting?: boolean
  autoSelectFunnel?: boolean
  submitLabel?: string
  cancelLabel?: string
}

const fieldClass =
  "h-[42px] rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[13px] text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
const textareaClass =
  "min-h-[86px] rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-3 text-[13px] text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
const labelClass = "text-[13px] font-medium leading-none text-[var(--text-primary)]"

const normalizeMoneyInput = (value: string) => {
  const normalized = value.replace(/\s/g, "").replace(",", ".")
  const [integer = "", ...fractionParts] = normalized.split(".")
  const digits = integer.replace(/\D/g, "")
  const fraction = fractionParts.join("").replace(/\D/g, "").slice(0, 2)
  return fractionParts.length > 0 ? `${digits}.${fraction}` : digits
}

const formatMoneyInput = (value: string) => {
  const normalized = normalizeMoneyInput(value)
  if (!normalized) return ""
  const [integer, fraction] = normalized.split(".")
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return fraction !== undefined ? `${formattedInteger}.${fraction}` : formattedInteger
}

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <label className={labelClass}>
      {children}
      <span className="text-[#ff3b30]">*</span>
    </label>
  )
}

function AddButton({ href, label }: { href: string; label: string }) {
  return (
      <Link
      href={href}
      aria-label={label}
      className="ml-2 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[7px] border border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm transition hover:border-[var(--primary-hover)] hover:bg-[var(--primary-hover)]"
    >
      <Plus className="h-4 w-4" />
    </Link>
  )
}

export default function DealForm({
  onSubmit,
  autoSelectFunnel = false,
}: DealFormProps) {
  const { t } = useTranslation("common")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const formData = useDealStore((state) => state.formData)
  const clients = useDealStore((state) => state.clients)
  const counterparties = useDealStore((state) => state.counterparties)
  const companies = useDealStore((state) => state.companies)
  const warehouses = useDealStore((state) => state.warehouses)
  const currencies = useDealStore((state) => state.currencies)
  const referenceLoading = useDealStore((state) => state.referenceLoading)
  const funnels = useDealStore((state) => state.funnels)
  const setFormField = useDealStore((state) => state.setFormField)

  const returnTo = useMemo(() => {
    const query = searchParams.toString()
    return `${pathname}${query ? `?${query}` : ""}`
  }, [pathname, searchParams])

  const buildReferenceHref = (href: string) => {
    const params = new URLSearchParams()
    params.set("returnTo", returnTo)
    return `${href}?${params.toString()}`
  }

  const paymentSummary = useMemo(() => {
    const total = Number(formData.dealAmount || 0)
    const payCard = Number(formData.payCard || 0)
    const payCash = Number(formData.payCash || 0)
    const paid = (Number.isFinite(payCard) ? payCard : 0) + (Number.isFinite(payCash) ? payCash : 0)
    const remaining = Math.max(0, (Number.isFinite(total) ? total : 0) - paid)
    const status =
      total > 0 && paid >= total
        ? t("dealAdd.payment.paid", { defaultValue: "Оплачено" })
        : paid > 0
          ? t("dealAdd.payment.partial")
          : t("dealAdd.payment.unpaid")
    const formatter = (value: number) => formatMoney(value, formData.currency)
    return { total, paid, remaining, status, formatter }
  }, [formData.currency, formData.dealAmount, formData.payCard, formData.payCash, t])

  useEffect(() => {
    if (autoSelectFunnel && !formData.funnelId && funnels.length > 0) {
      setFormField("funnelId", funnels[0].id)
    }
  }, [autoSelectFunnel, formData.funnelId, funnels, setFormField])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit?.(formData)
  }

  const renderSelect = (
    value: string,
    field: keyof DealFormData,
    placeholder: string,
    options: { id: string; name?: string; label?: string }[],
  ) => (
    <Select
      value={value}
      onValueChange={(nextValue) => setFormField(field, nextValue)}
      disabled={referenceLoading}
    >
      <SelectTrigger className={fieldClass}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name || option.label || option.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <form
      id="deal-form"
      onSubmit={handleSubmit}
      className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] px-5 py-5 shadow-[var(--surface-shadow)]"
    >
      <div className="grid gap-x-5 gap-y-4 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel>{t("dealForm.fields.client.label")}</RequiredLabel>
            <div className="flex">
              <div className="min-w-0 flex-1">
                {renderSelect(formData.client, "client", t("dealForm.fields.client.placeholder"), clients)}
              </div>
              <AddButton href={buildReferenceHref("/dashboard/clients/add")} label={t("clientsPage.addButton")} />
            </div>
          </div>

          <div className="space-y-2">
            <RequiredLabel>{t("dealForm.fields.company.label")}</RequiredLabel>
            {renderSelect(formData.company, "company", t("dealForm.fields.company.placeholder"), companies)}
          </div>

          <div className="space-y-2">
            <RequiredLabel>{t("dealForm.fields.contractNumber.label")}</RequiredLabel>
            <Input
              value={formData.contractNumber}
              onChange={(event) => setFormField("contractNumber", event.target.value)}
              placeholder={t("dealForm.fields.contractNumber.placeholder")}
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClass}>{t("dealForm.fields.comments.label")}</label>
            <Textarea
              value={formData.comments}
              onChange={(event) => setFormField("comments", event.target.value)}
              placeholder={t("dealForm.fields.comments.placeholder")}
              className={textareaClass}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel>{t("dealForm.fields.counterparty.label")}</RequiredLabel>
            <div className="flex">
              <div className="min-w-0 flex-1">
                {renderSelect(formData.counterparty, "counterparty", t("dealForm.fields.counterparty.placeholder"), counterparties)}
              </div>
              <AddButton href={buildReferenceHref("/dashboard/counterparties/add")} label={t("counterpartiesPage.addButton")} />
            </div>
          </div>

          <div className="space-y-2">
            <RequiredLabel>{t("warehouse.table.warehouse")}</RequiredLabel>
            <div className="flex">
              <div className="min-w-0 flex-1">
                {renderSelect(formData.warehouse, "warehouse", t("warehouse.chooseProduct"), warehouses)}
              </div>
              <AddButton href="/dashboard/werehouses" label={t("warehouse.pageTitle")} />
            </div>
          </div>

          <div className="space-y-2">
            <RequiredLabel>{t("dealForm.fields.plannedShipmentDate.label")}</RequiredLabel>
            <div className="relative">
              <Input
                type="date"
                value={formData.plannedShipmentDate}
                onChange={(event) => setFormField("plannedShipmentDate", event.target.value)}
                className={`${fieldClass} pr-10`}
              />
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            </div>
          </div>

          <div className="space-y-2">
            <RequiredLabel>{t("dealForm.fields.guarantee.label")}</RequiredLabel>
            <Input
              value={formData.guarantee}
              onChange={(event) => setFormField("guarantee", event.target.value)}
              placeholder={t("dealForm.fields.guarantee.placeholder")}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel>{t("dealForm.fields.dealAmount.label")}</RequiredLabel>
            <Input
              type="text"
              inputMode="decimal"
              value={formatMoneyInput(formData.dealAmount)}
              onChange={(event) => setFormField("dealAmount", normalizeMoneyInput(event.target.value))}
              placeholder={t("dealForm.fields.dealAmount.placeholder")}
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <RequiredLabel>{t("dealForm.fields.currency.label")}</RequiredLabel>
            {renderSelect(
              formData.currency,
              "currency",
              t("dealForm.fields.currency.placeholder"),
              currencies.map((item) => ({ id: item.id, label: item.label })),
            )}
          </div>

          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-3">
            <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">{t("dealForm.multiPayment.title", { defaultValue: "Multi-payment" })}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="text"
                inputMode="decimal"
                value={formatMoneyInput(formData.payCard)}
                onChange={(event) => setFormField("payCard", normalizeMoneyInput(event.target.value))}
                placeholder={t("dealForm.fields.payCard.label")}
                className={fieldClass}
              />
              <Input
                type="text"
                inputMode="decimal"
                value={formatMoneyInput(formData.payCash)}
                onChange={(event) => setFormField("payCash", normalizeMoneyInput(event.target.value))}
                placeholder={t("dealForm.fields.payCash.label")}
                className={fieldClass}
              />
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
              {t("dealForm.multiPayment.help", { defaultValue: "You can split the payment between transfer and cash." })}
            </p>
            <div className="mt-3 grid gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)] p-3 text-[12px]">
              <PaymentLine label={t("finance.totalAmount", { defaultValue: "Общая сумма" })} value={paymentSummary.formatter(paymentSummary.total)} />
              <PaymentLine label={t("finance.paidAmount", { defaultValue: "Оплачено" })} value={paymentSummary.formatter(paymentSummary.paid)} />
              <PaymentLine label={t("finance.remainingAmount", { defaultValue: "Осталось" })} value={paymentSummary.formatter(paymentSummary.remaining)} />
              <PaymentLine label={t("finance.paymentStatus", { defaultValue: "Статус оплаты" })} value={paymentSummary.status} strong />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function PaymentLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={strong ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-primary)]"}>{value}</span>
    </div>
  )
}
