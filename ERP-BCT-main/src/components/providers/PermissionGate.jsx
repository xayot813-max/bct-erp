"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useAuth } from "@/components/providers/AuthProvider"
import { getPermissionForPath, hasPermission } from "@/lib/access-control"

export default function PermissionGate({ children }) {
  const { t } = useTranslation("common")
  const pathname = usePathname()
  const { user } = useAuth()
  const permission = getPermissionForPath(pathname)

  if (permission && !hasPermission(user, permission)) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-[95%] max-w-[900px] items-center justify-center py-16">
        <div className="w-full rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-8 text-center shadow-[var(--surface-shadow)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--surface-elevated)] text-[var(--danger)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-[24px] font-semibold text-[var(--text-primary)]">
            {t("settings.access.deniedTitle", { defaultValue: "Нет доступа" })}
          </h1>
          <p className="mx-auto mt-2 max-w-[520px] text-[14px] text-[var(--text-secondary)]">
            {t("settings.access.deniedDescription", {
              defaultValue: "Администратор не выдал доступ к этой странице.",
            })}
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            {t("header.dashboard.li1", { defaultValue: "Главная" })}
          </Link>
        </div>
      </div>
    )
  }

  return children
}
