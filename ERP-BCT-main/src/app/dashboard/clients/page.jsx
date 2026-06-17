"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { FolderTree, Loader2, Plus, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DataTable } from "@/components/shared/DataTable"
import { getClientsColumns } from "@/lib/columns"
import { getClients } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toastError } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"

function ClientTabs({ active }) {
  const { t } = useTranslation("common")
  const tabs = [
    { label: t("clientsPage.tabs.clients", { defaultValue: "Clients" }), href: "/dashboard/clients", key: "clients" },
    { label: t("clientsPage.tabs.companies", { defaultValue: "Companies" }), href: "/dashboard/companies", key: "companies" },
  ]

  return (
    <div className="flex h-[36px] w-[240px] rounded-[8px] border border-[var(--border-default)] bg-[var(--surface)] p-[3px] shadow-[var(--surface-shadow)]">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`flex flex-1 items-center justify-center rounded-[6px] text-[12px] font-medium ${
            active === tab.key
              ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

export default function ClientsPage() {
  const { t, i18n } = useTranslation("common")
  const columns = useMemo(() => getClientsColumns(t), [t, i18n.language])

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const loadClients = async () => {
      setLoading(true)
      try {
        const response = await getClients({ limit: 200 })
        const data = response?.data || response?.clients || response?.items || []
        setClients(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to load clients:", error)
        toastError({
          title: t("clientsPage.loadErrorTitle", { defaultValue: "Failed to load clients" }),
          description: error?.message,
        })
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [t])

  const visibleClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return clients

    return clients.filter((client) => {
      const fullName = [client.first_name, client.last_name, client.name].filter(Boolean).join(" ")
      return [fullName, client.company, client.phone, client.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [clients, searchQuery])

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BackLinkButton href="/dashboard" />
          <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {t("clientsPage.title", { defaultValue: "Clients" })}
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <ClientTabs active="clients" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder={t("table.searchPlaceholder", { defaultValue: "Search..." })}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-[36px] w-[220px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] pl-9 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <Link href="/dashboard/clients/groups">
            <Button variant="outline" className="h-[36px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
              <FolderTree className="mr-2 h-4 w-4" />
              {t("clientsPage.groups.pageLink", { defaultValue: "Customer groups" })}
            </Button>
          </Link>
          <Link href="/dashboard/clients/add">
            <Button variant="outline" className="h-[36px] w-[156px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
              <Plus className="mr-1 h-4 w-4" />
              {t("clientsPage.addButton", { defaultValue: "Add client" })}
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          allData={visibleClients}
          defaultItemsPerPage={10}
          serverSide={false}
        />
      )}
    </div>
  )
}
