"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Plus, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import BackLinkButton from "@/components/shared/BackLinkButton"
import { DataTable } from "@/components/shared/DataTable"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getSuppliersColumns } from "@/lib/columns"
import { getVendors } from "@/lib/actions"
import { toastError } from "@/lib/toast"

export default function SuppliersPage() {
  const { t } = useTranslation("common")
  const columns = useMemo(() => getSuppliersColumns(t), [t])

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    const loadSuppliers = async () => {
      setLoading(true)
      try {
        const response = await getVendors({ page: pagination.page, limit: pagination.limit })
        const data = response?.data || response?.vendors || []
        setSuppliers(Array.isArray(data) ? data : [])
        setPagination((prev) => ({
          ...prev,
          total: response?.total ?? (Array.isArray(data) ? data.length : 0),
        }))
      } catch (error) {
        console.error("Error loading suppliers:", error)
        toastError({
          title: t("suppliersPage.loadErrorTitle"),
          description: error?.message,
        })
      } finally {
        setLoading(false)
      }
    }

    loadSuppliers()
  }, [pagination.page, pagination.limit, t])

  const visibleSuppliers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return suppliers

    return suppliers.filter((supplier) =>
      [supplier.name, supplier.phone, supplier.agent, supplier.comment]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
  }, [searchQuery, suppliers])

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackLinkButton href="/dashboard/werehouses" />
          <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {t("suppliersPage.title")}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder={t("suppliersPage.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-[220px] rounded-[10px] border-[var(--border-default)] bg-[var(--surface)] pl-10 text-[13px]"
            />
          </div>
          <Link href="/dashboard/werehouses/suppliers/add">
            <Button variant="outline" className="h-11 min-w-[176px] rounded-[10px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
              <Plus className="mr-1 h-4 w-4" />
              {t("suppliersPage.addButton")}
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
          allData={visibleSuppliers}
          defaultItemsPerPage={pagination.limit}
          totalData={searchQuery ? visibleSuppliers.length : pagination.total}
          serverSide={true}
          onPageChange={(page, limit) => setPagination((prev) => ({ ...prev, page, limit }))}
          onLimitChange={(limit) => setPagination((prev) => ({ ...prev, page: 1, limit }))}
        />
      )}
    </div>
  )
}
