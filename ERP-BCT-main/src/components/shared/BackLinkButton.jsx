"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

const baseClassName =
  "flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"

export default function BackLinkButton({
  href = undefined,
  onClick = undefined,
  className = "",
  iconClassName = "",
  label = "",
}) {
  const { t } = useTranslation("common")
  const resolvedLabel = label || t("common.back", { defaultValue: "Back" })
  const classes = cn(baseClassName, className)

  if (href) {
    return (
      <Link href={href} onClick={onClick} aria-label={resolvedLabel} className={classes}>
        <ArrowLeft className={cn("h-5 w-5", iconClassName)} />
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} aria-label={resolvedLabel} className={classes}>
      <ArrowLeft className={cn("h-5 w-5", iconClassName)} />
    </button>
  )
}
