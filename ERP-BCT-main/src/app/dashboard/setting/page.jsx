"use client"

import Link from "next/link"
import { ArrowRight, ShieldCheck, UserCog } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/components/providers/AuthProvider"
import { hasPermission } from "@/lib/access-control"

const cards = [
  {
    href: "/dashboard/setting/profile",
    icon: UserCog,
    titleKey: "settings.profile.title",
    descKey: "settings.profile.desc",
    title: "Профиль администратора",
    desc: "Логин и пароль текущего администратора.",
    permission: "settings",
  },
  {
    href: "/dashboard/setting/access",
    icon: ShieldCheck,
    titleKey: "settings.access.title",
    descKey: "settings.access.desc",
    title: "Настройки доступа",
    desc: "Реальные пользователи админ-панели без демо-сотрудников.",
    permission: "access",
  },
]

export default function SettingsPage() {
  const { t } = useTranslation("common")
  const { user } = useAuth()

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
        {t("settings.title", { defaultValue: "Настройки" })}
      </h1>
      <p className="mt-3 text-[13px] text-[var(--text-secondary)]">
        {t("settings.subtitle", { defaultValue: "Управление профилем, доступом и системными параметрами ERP." })}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {cards.filter((card) => hasPermission(user, card.permission)).map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[16px] border border-[var(--border-default)] bg-[var(--surface)] p-6 shadow-[var(--surface-shadow)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--surface-elevated)] text-[var(--text-primary)] ring-1 ring-[var(--border-default)]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-[22px] font-semibold text-[var(--text-primary)]">
                {t(card.titleKey, { defaultValue: card.title })}
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                {t(card.descKey, { defaultValue: card.desc })}
              </p>
              <div className="mt-6 inline-flex h-9 items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] font-medium text-[var(--text-primary)] transition group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-foreground)]">
                {t("settings.open", { defaultValue: "Открыть" })}
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
