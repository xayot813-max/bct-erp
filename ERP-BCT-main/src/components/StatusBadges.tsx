"use client"

import { CreditCard, Info } from "lucide-react"
import { useTranslation } from "react-i18next"

type StatusBadgesProps = {
  statusLabel?: string
  statusValue?: string
  statusColor?: string
  paymentLabel?: string
  paymentValue?: string
  showPayment?: boolean
}

export default function StatusBadges({
  statusLabel,
  statusValue,
  statusColor,
  paymentLabel,
  paymentValue,
  showPayment = true,
}: StatusBadgesProps) {
  const { t } = useTranslation("common")
  const root =
    typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null
  const accent = root?.getPropertyValue("--primary").trim() || "#2d3340"
  const accentText =
    root?.getPropertyValue("--accent-foreground").trim() ||
    root?.getPropertyValue("--text-primary").trim() ||
    "#111827"
  const danger = root?.getPropertyValue("--danger").trim() || "#C43A2F"

  const toBadgeStyle = (hex?: string) => {
    if (!hex || typeof hex !== "string") {
      return {
        backgroundColor: `${accent}1f`,
        color: accentText,
        borderColor: `${accent}40`,
      }
    }

    const normalized = hex.replace("#", "")
    const bigint = parseInt(normalized, 16)
    if (Number.isNaN(bigint)) {
      return {
        backgroundColor: `${accent}1f`,
        color: accentText,
        borderColor: `${accent}40`,
      }
    }
    const isShort = normalized.length === 3
    const r = isShort ? ((bigint >> 8) & 0xf) * 17 : (bigint >> 16) & 255
    const g = isShort ? ((bigint >> 4) & 0xf) * 17 : (bigint >> 8) & 255
    const b = isShort ? (bigint & 0xf) * 17 : bigint & 255
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
      color: `rgb(${r}, ${g}, ${b})`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.25)`,
    }
  }

  const statusStyle = statusColor
    ? toBadgeStyle(statusColor)
    : {
        backgroundColor: `${accent}1f`,
        color: accentText,
        borderColor: `${accent}40`,
      }
  const paymentDanger = {
    color: danger,
    backgroundColor: `color-mix(in srgb, ${danger} 16%, transparent)`,
    borderColor: `color-mix(in srgb, ${danger} 30%, transparent)`,
  }
  const resolvedStatusLabel = statusLabel || t("dealAdd.status.label", { defaultValue: "Status" })
  const resolvedStatusValue = statusValue || t("dealAdd.status.creating", { defaultValue: "Creating" })
  const resolvedPaymentLabel = paymentLabel || t("dealAdd.payment.label", { defaultValue: "Payment" })
  const resolvedPaymentValue = paymentValue || t("dealAdd.payment.unpaid", { defaultValue: "Unpaid" })

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-primary)] shadow-[var(--surface-shadow)]">
        <Info className="h-4 w-4" />
        {resolvedStatusLabel}:{" "}
        <span
          className="rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{
            color: statusStyle.color,
            backgroundColor: statusStyle.backgroundColor,
            borderColor: statusStyle.borderColor,
          }}
        >
          {resolvedStatusValue}
        </span>
      </span>
      {showPayment && (
        <span className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-primary)] shadow-[var(--surface-shadow)]">
          <CreditCard className="h-4 w-4" />
          {resolvedPaymentLabel}:{" "}
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{
              color: paymentDanger.color,
              backgroundColor: paymentDanger.backgroundColor,
              borderColor: paymentDanger.borderColor,
            }}
          >
            {resolvedPaymentValue}
          </span>
        </span>
      )}
    </div>
  )
}
