"use client"

import { DataTable } from '@/components/shared/DataTable'
import { getProductsColumns } from '@/lib/columns'
import { getLocalizedValue } from '@/lib/multilingual'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, Search } from 'lucide-react'
import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { getProducts, getCategories } from '@/lib/actions'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { extractArrayFromResponse, toSelectOption } from '@/lib/utils/api-helpers'
import { toastError } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const columns = useMemo(() => getProductsColumns(t, i18n.language), [t, i18n.language]);

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 1000,
    total: 0,
  })

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await getCategories({ limit: 100 })
        const raw = extractArrayFromResponse(response, ["categories"])
        const normalized = raw
          .map((item, index) =>
            toSelectOption(item, index, t("productsPage.categoryFallback", { index: index + 1 })),
          )
          .filter(Boolean)
        setCategories(normalized)
      } catch (error) {
        console.error('Error loading categories:', error)
        setCategories([])
      }
    }

    loadCategories()
  }, [t])

  // Load products with filters
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
        }

        if (debouncedSearchQuery) {
          params.search = debouncedSearchQuery
        }

        if (selectedCategory && selectedCategory !== 'all') {
          params.category_id = selectedCategory
        }

        const response = await getProducts(params)
        const productItems = extractArrayFromResponse(response, ["products"])
        setProducts(Array.isArray(productItems) ? productItems : [])
        setPagination(prev => ({
          ...prev,
          total:
            response?.meta?.total ??
            response?.total ??
            (Array.isArray(productItems) ? productItems.length : prev.total),
        }))
      } catch (error) {
        console.error('Error loading products:', error)
        toastError({
          title: t("productsPage.loadErrorTitle"),
          description: error.message,
        })
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [pagination.page, pagination.limit, debouncedSearchQuery, selectedCategory])

  // Debounced search - reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim())
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle page change from DataTable
  const handlePageChange = (page, limit) => {
    setPagination(prev => ({ ...prev, page, limit }))
  }

  // Handle limit change from DataTable
  const handleLimitChange = (limit) => {
    setPagination({ page: 1, limit, total: pagination.total })
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BackLinkButton href="/dashboard" />
          <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">{t("productsPage.title")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder={t("productsPage.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-[180px] rounded-[10px] border-[var(--border-default)] bg-[var(--surface)] pl-10 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-100"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-11 w-[160px] rounded-[10px] border-[var(--border-default)] bg-[var(--surface)] text-[13px] text-[var(--text-primary)]">
              <SelectValue placeholder={t("productsPage.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("productsPage.allCategories")}</SelectItem>
              {categories.map((category) => {
                const localized =
                  getLocalizedValue(category.name, i18n.language) ||
                  (category.raw
                    ? getLocalizedValue(category.raw.name || category.raw.title, i18n.language)
                    : "")
                const label =
                  (typeof localized === "string" && localized.trim().length > 0 ? localized : undefined) ||
                  (typeof category.displayName === "string" && category.displayName.trim().length > 0
                    ? category.displayName
                    : category.id)
                return (
                  <SelectItem key={category.id} value={category.id}>
                    {label}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Link href="/dashboard/products/add">
            <Button variant="outline" className="h-11 min-w-[156px] rounded-[10px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
              <Plus className="mr-1 h-4 w-4" />
              {t("productsPage.addButton")}
            </Button>
          </Link>
        </div>
      </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            allData={products}
            defaultItemsPerPage={pagination.limit}
            totalData={pagination.total}
            serverSide={true}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}
    </div>
  )
}
