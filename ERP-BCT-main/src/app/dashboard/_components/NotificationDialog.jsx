"use client"

import React from 'react'
import { BellRing } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import NewOrder from './NewOrder'
import { useTranslation } from 'react-i18next'
import { useTheme } from "next-themes"

export default function NotificationDialog() {
  const { t } = useTranslation()
  useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          aria-label={t("header.menuDialog.notif")}
          className='relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--header-border)] bg-[var(--header-surface)] p-0 text-[var(--header-text)] shadow-none transition-all duration-200 hover:bg-[var(--header-surface-hover)]'
        >
          <BellRing className="h-[18px] w-[18px] text-[var(--header-text)]" />
          <div className='absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[7px] font-semibold leading-none text-white'>
            new
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={"mr-1 w-[208px] rounded-[12px] border border-[var(--header-border)] bg-[var(--header-bg)] p-2 text-[var(--header-text)] shadow-[0_18px_40px_rgba(15,23,42,0.24)]"}
      >
        <DropdownMenuLabel className={"px-2 py-2 text-center text-[13px] font-semibold text-[var(--header-text)]"}>{t("header.menuDialog.notif")}</DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-transparent" />
        <DropdownMenuItem className={"rounded-[8px] bg-[var(--header-surface)] p-0 focus:bg-[var(--header-surface)]"}>
          <NewOrder />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
