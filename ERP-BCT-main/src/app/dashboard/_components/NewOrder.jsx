"use client"

import { Button } from '@/components/ui/button'
import { BellRing } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

export default function NewOrder() {
  const { t } = useTranslation()
  return (
    <div className="flex h-10 w-full items-center justify-start gap-2 px-1">
      <Button className='flex h-5 w-5 items-center justify-center rounded-[4px] bg-[var(--danger)] p-0 hover:brightness-95'>
        <BellRing className='h-3 w-3 text-white' />
      </Button>
      <div className='min-w-0'>
        <h1 className='truncate text-[10px] font-medium leading-tight text-[var(--header-text)]'>
          {t("header.menuDialog.newOrder")}
        </h1>
        <p className='truncate text-[8px] text-[var(--header-muted)]'>{t("header.menuDialog.newOrderSite")}</p>
      </div>
    </div>
  )
}
