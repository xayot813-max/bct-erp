"use client"

import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { useTranslation } from 'react-i18next'
import NotificationDialog from './NotificationDialog'
import { useAuth } from '@/components/providers/AuthProvider'
import { LogOut, UserCircle } from 'lucide-react'
import { hasPermission } from '@/lib/access-control'

export default function DashboardHeader() {
  const { t } = useTranslation("common")
  const { user, isAuthenticated, clearAuth } = useAuth()
  const pathname = usePathname();

  const navLinks = [
    {
      name: t("header.dashboard.li1"),
      icon: "/headIcons/home.svg",
      link: "/dashboard"
      , permission: "dashboard"
    },
    {
      name: t("header.dashboard.li2"),
      icon: "/headIcons/user.svg",
      link: "/dashboard/clients",
      permission: "clients",
    },
    {
      name: t("header.dashboard.li3"),
      icon: "/headIcons/product.svg",
      link: "/dashboard/products"
      , permission: "products"
    },
    {
      name: t("header.dashboard.li4"),
      icon: "/headIcons/store.svg",
      link: "/dashboard/werehouses"
      , permission: "warehouse"
    },
    {
      name: t("header.dashboard.li5"),
      icon: "/headIcons/deal.svg",
      link: "/dashboard/deals"
      , permission: "deals"
    },
    {
      name: t("header.dashboard.li8"),
      icon: "/headIcons/cache.svg",
      link: "/dashboard/finance",
      permission: "finance",
    },
    {
      name: t("header.dashboard.settings"),
      icon: "/headIcons/store.svg",
      link: "/dashboard/setting",
      permission: "settings",
    },
  ]

  // Active link tekshirish funksiyasi
  const isActiveLink = (link) => {
    if (link === "/dashboard") {
      return pathname === "/dashboard";
    } else {
      return pathname === link || pathname.startsWith(link + "/");
    }
  }

  return (
    <header className='fixed left-0 top-0 z-[999] w-full border-b border-[var(--header-border)] bg-[var(--header-bg)] text-[var(--header-text)] shadow-[0_10px_28px_rgba(15,23,42,0.18)]'>
      <div className="mx-auto flex h-14 w-full max-w-[1920px] items-center justify-between gap-3 px-4">
      <div className='flex h-full min-w-0 flex-1 items-center gap-5'>
        <Image className='h-8 w-auto shrink-0' width={76} height={34} src="/logo.png" alt="logo" loading='eager' />

        <nav className='hidden h-full min-w-0 flex-1 items-center gap-1 lg:flex'>
          {navLinks?.filter((nv) => hasPermission(user, nv.permission)).map((nv, idx) => {
            return (
              <Link
                key={idx}
                href={nv?.link}
                className={cn(
                  "flex h-9 min-w-0 items-center justify-center gap-2 rounded-[8px] px-2.5 text-[12px] transition-all duration-200 xl:px-3",
                  isActiveLink(nv?.link)
                    ? "bg-[var(--header-surface)] text-[var(--header-text)]"
                    : "text-[var(--header-muted)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]"
                )}
              >
                <Image className="shrink-0" src={nv?.icon} alt={nv?.name} width={14} height={14} />
                <span className='hidden max-w-[92px] truncate xl:inline 2xl:max-w-36'>{nv?.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        {hasPermission(user, "deals") && (
        <Link
          href="/dashboard/deals/add"
          className="flex h-9 items-center gap-2 rounded-[10px] border border-[var(--primary)] bg-[var(--primary)] px-3 text-[12px] font-medium text-[var(--primary-foreground)] shadow-sm transition hover:border-[var(--primary-hover)] hover:bg-[var(--primary-hover)] sm:px-4"
        >
          <Image src="/headIcons/createDeal.svg" alt="" width={14} height={14} />
          <span className="hidden sm:inline">{t("header.dashboard.add-deal")}</span>
        </Link>
        )}
        <NotificationDialog />
        <ThemeToggle />
        <LanguageSwitcher />
        {isAuthenticated && (
          <Link
            href="/dashboard/setting/profile"
            className={cn(
              "flex h-9 items-center gap-2 rounded-[10px] border border-[var(--header-border)] bg-[var(--header-surface)] px-3 text-[12px] font-medium text-[var(--header-text)] transition hover:bg-[var(--header-surface-hover)]",
              pathname === "/dashboard/setting/profile" && "bg-[var(--header-surface-hover)]"
            )}
          >
            <UserCircle className="h-4 w-4" />
            <span className="hidden xl:inline">{t("header.dashboard.profile", { defaultValue: "Профиль" })}</span>
          </Link>
        )}
        {isAuthenticated && (
          <button
            type="button"
            onClick={clearAuth}
            className="flex h-9 items-center gap-2 rounded-[10px] border border-[var(--header-border)] bg-[var(--header-surface)] px-3 text-[12px] font-medium text-[var(--header-text)] transition hover:bg-[var(--header-surface-hover)]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xl:inline">{t("header.dashboard.logout", { defaultValue: "Выйти" })}</span>
          </button>
        )}
      </div>
      </div>
    </header>
  )
}
