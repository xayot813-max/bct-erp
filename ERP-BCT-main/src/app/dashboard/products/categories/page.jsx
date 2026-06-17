"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Plus, Loader2, Search } from "lucide-react"

import { DataTable } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCategories } from "@/lib/actions"
import { getCategoriesColumns } from "@/lib/columns"
import { toastError } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"

export default function CategoriesPage() {
  const { t, i18n } = useTranslation("common")
  const columns = useMemo(() => getCategoriesColumns(t, i18n.language), [t, i18n.language])

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  })

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true)
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
        }
        const response = await getCategories(params)
        const data = response.data || response.categories || []

        setCategories(Array.isArray(data) ? data : [])
        setPagination((prev) => ({
          ...prev,
          total:
            response.total ??
            response.meta?.total ??
            (Array.isArray(data) ? data.length : prev.total),
        }))
      } catch (error) {
        console.error("Error loading categories:", error)
        toastError({
          title: t("categoriesPage.loadErrorTitle", { defaultValue: "Failed to load categories" }),
          description: error.message,
        })
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [pagination.page, pagination.limit])

  const handlePageChange = (page, limit) => {
    setPagination((prev) => ({ ...prev, page, limit }))
  }

  const handleLimitChange = (limit) => {
    setPagination((prev) => ({ ...prev, page: 1, limit }))
  }

  const visibleCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return categories

    return categories.filter((category) => {
      const text = [
        category.title,
        category.name,
        category.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return text.includes(query)
    })
  }, [categories, searchQuery])

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BackLinkButton href="/dashboard/products" />
          <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {t("categoriesPage.title", { defaultValue: "Categories" })}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder={t("table.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-[36px] w-[220px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] pl-9 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <Link href="/dashboard/products/categories/add">
            <Button variant="outline" className="h-[36px] w-[170px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
              <Plus className="mr-1 h-4 w-4" />
              {t("categoriesPage.addButton", { defaultValue: "Add category" })}
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
            allData={visibleCategories}
            defaultItemsPerPage={pagination.limit}
            totalData={searchQuery ? visibleCategories.length : pagination.total}
            serverSide={true}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}
    </div>
  )
}
