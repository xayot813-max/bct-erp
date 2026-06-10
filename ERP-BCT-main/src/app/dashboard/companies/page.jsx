"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Plus, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DataTable } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCompaniesColumns } from "@/lib/columns"
import { getCompanies } from "@/lib/actions"
import { toastError } from "@/lib/toast"

function ClientTabs({ active }) {
  const { t } = useTranslation("common")
  const tabs = [
    { label: t("companiesPage.tabs.clients", { defaultValue: "Clients" }), href: "/dashboard/clients", key: "clients" },
    { label: t("companiesPage.tabs.companies", { defaultValue: "Companies" }), href: "/dashboard/companies", key: "companies" },
  ]

  return (
    <div className="flex h-[36px] w-[240px] rounded-[8px] border border-[var(--border-default)] bg-[var(--surface)] p-[3px] shadow-[var(--surface-shadow)]">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`flex flex-1 items-center justify-center rounded-[6px] text-[12px] font-medium ${
            active === tab.key ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

export default function CompaniesPage() {
  const { t, i18n } = useTranslation("common")
  const columns = useMemo(() => getCompaniesColumns(t), [t, i18n.language])

  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const loadCompanies = async () => {
      setLoading(true)
      try {
        const response = await getCompanies({ limit: 200 })
        const data = response?.data || response?.companies || response?.items || []
        setCompanies(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to load companies:", error)
        toastError({
          title: t("companiesPage.loadErrorTitle", { defaultValue: "Failed to load companies" }),
          description: error?.message,
        })
      } finally {
        setLoading(false)
      }
    }

    loadCompanies()
  }, [])

  const visibleCompanies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return companies
    return companies.filter((company) =>
      [company.name, company.email, company.phone, company.inn]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
  }, [companies, searchQuery])

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">{t("companiesPage.title", { defaultValue: "Companies" })}</h1>
        <div className="flex items-center gap-3">
          <ClientTabs active="companies" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder={t("table.searchPlaceholder", { defaultValue: "Search..." })}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-[36px] w-[220px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] pl-9 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
        <Link href="/dashboard/companies/add">
          <Button variant="outline" className="h-[36px] w-[170px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
            <Plus className="mr-1 h-4 w-4" /> {t("companiesPage.addButton", { defaultValue: "Add company" })}
          </Button>
        </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable columns={columns} allData={visibleCompanies} defaultItemsPerPage={10} serverSide={false} />
      )}
    </div>
  )
}
