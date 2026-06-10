"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DataTable } from "@/components/shared/DataTable"
import MenuTab from "@/components/shared/menuTab"
import { Button } from "@/components/ui/button"
import { getCounterpartiesColumns } from "@/lib/columns"
import { getCounterparties } from "@/lib/actions"
import { toastError } from "@/lib/toast"

export default function CounterpartiesPage() {
  const { t, i18n } = useTranslation()
  const columns = useMemo(() => getCounterpartiesColumns(t), [t, i18n.language])

  const [counterparties, setCounterparties] = useState([])
  const [loading, setLoading] = useState(true)
  const menu = useMemo(
    () => [
      { title: t("counterpartiesPage.menu.clients.title"), desc: t("counterpartiesPage.menu.clients.desc"), link: "/dashboard/clients" },
      { title: t("counterpartiesPage.menu.companies.title"), desc: t("counterpartiesPage.menu.companies.desc"), link: "/dashboard/companies" },
      { title: t("counterpartiesPage.menu.counterparties.title"), desc: t("counterpartiesPage.menu.counterparties.desc"), link: "/dashboard/counterparties" },
    ],
    [t],
  )

  useEffect(() => {
    const loadCounterparties = async () => {
      setLoading(true)
      try {
        const response = await getCounterparties({ limit: 200 })
        const data = response?.data || response?.counterparties || response?.items || []
        setCounterparties(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to load counterparties:", error)
        toastError({
          title: t("counterpartiesPage.loadErrorTitle"),
          description: error?.message,
        })
      } finally {
        setLoading(false)
      }
    }

    loadCounterparties()
  }, [])

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[#252936]">{t("counterpartiesPage.title")}</h1>
        <Link href="/dashboard/counterparties/add">
          <Button variant="outline" className="h-[44px] w-auto rounded-[12px] border-[var(--border-default)] bg-[var(--surface)] px-5 text-[14px] font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-hover)]">
            <Plus className="h-4 w-4 mr-2" /> {t("counterpartiesPage.addButton")}
          </Button>
        </Link>
      </div>

      <MenuTab menu={menu} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable columns={columns} allData={counterparties} defaultItemsPerPage={10} serverSide={false} />
      )}
    </div>
  )
}
