"use client"

import React, { useState, useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from "react-i18next"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

export function DataTable({
  columns,
  allData,
  defaultItemsPerPage = 10,
  totalData,
  serverSide = false, // Flag for server-side pagination
  onPageChange, // Callback for page change (server-side)
  onLimitChange, // Callback for limit change (server-side)
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [columnVisibility, setColumnVisibility] = useState({})
  const [globalFilter, setGlobalFilter] = useState("")

  // Get page and limit from URL
  const currentPage = parseInt(searchParams.get('page') || '1')
  const itemsPerPage = parseInt(searchParams.get('limit') || defaultItemsPerPage.toString())

  // Server-side pagination: use API data directly
  // Client-side pagination: filter and slice locally
  const filteredData = useMemo(() => {
    if (serverSide) return allData // Use data from API as-is

    if (!globalFilter) return allData

    return allData.filter(item => {
      return Object.values(item).some(value =>
        value?.toString().toLowerCase().includes(globalFilter.toLowerCase())
      )
    })
  }, [allData, globalFilter, serverSide])

  // For client-side, paginate locally
  const paginatedData = useMemo(() => {
    if (serverSide) return allData // Already paginated by API

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, itemsPerPage, serverSide, allData])

  // Calculate total pages
  const totalPages = serverSide
    ? Math.ceil((totalData || 0) / itemsPerPage)
    : Math.ceil(filteredData.length / itemsPerPage)

  // Handle page change
  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', page.toString())
    params.set('limit', itemsPerPage.toString())

    router.push(`${pathname}?${params.toString()}`, { scroll: false })

    // Call parent callback for server-side pagination
    if (serverSide && onPageChange) {
      onPageChange(page, itemsPerPage)
    }
  }

  // Handle limit change
  const handleLimitChange = (newLimit) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1') // Reset to page 1
    params.set('limit', newLimit.toString())

    router.push(`${pathname}?${params.toString()}`, { scroll: false })

    // Call parent callback for server-side pagination
    if (serverSide && onLimitChange) {
      onLimitChange(parseInt(newLimit))
    }
  }

  // Redirect to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      handlePageChange(1)
    }
  }, [currentPage, totalPages])

  // Ko'rsatiladigan sahifa raqamlarini hisoblash
  const getVisiblePages = () => {
    const pages = []
    const maxVisiblePages = 5
    const halfVisible = Math.floor(maxVisiblePages / 2)

    let startPage = Math.max(1, currentPage - halfVisible)
    let endPage = Math.min(totalPages, currentPage + halfVisible)

    if (currentPage <= halfVisible) {
      endPage = Math.min(totalPages, maxVisiblePages)
    }

    if (currentPage > totalPages - halfVisible) {
      startPage = Math.max(1, totalPages - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return pages
  }

  const visiblePages = getVisiblePages()
  const showStartEllipsis = visiblePages[0] > 1
  const showEndEllipsis = visiblePages[visiblePages.length - 1] < totalPages

  const table = useReactTable({
    data: paginatedData,
    columns,
    state: {
      columnVisibility,
      globalFilter,
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  // Calculate data range for display
  const dataCount = serverSide ? (totalData || 0) : filteredData.length
  const startItem = dataCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = Math.min(currentPage * itemsPerPage, dataCount)

  return (
    <div className="space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-4 text-[var(--text-primary)] shadow-[var(--surface-shadow)]">
      {/* 🔍 Search va Filter */}
      <div className="flex items-center justify-between gap-4">
        {/* Show search only for client-side pagination */}
        {!serverSide && (
          <Input
            placeholder={t("table.searchPlaceholder")}
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-[40px] max-w-[220px] rounded-[10px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-100"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className={"h-[40px] rounded-[10px] border-[var(--border-default)] px-4 text-[13px] font-medium"} variant="outline">{t("table.selectColumns")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table?.getAllLeafColumns().map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 📊 Table - Vertikal chiziqlari bilan */}
        <div className="overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)]">
        <Table>
          <TableHeader>
            {table?.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-[var(--surface)] hover:bg-[var(--surface)]">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-[42px] border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-[13px] font-medium text-[var(--text-secondary)] last:border-r-0"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  className={cn(idx % 2 == 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-elevated)]", "h-[54px] border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-r border-[var(--border-subtle)] px-3 py-2 text-[14px] text-[var(--text-primary)] last:border-r-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 border-r border-[var(--border-subtle)] bg-[var(--surface)] text-center text-[14px] text-[var(--text-secondary)]"
                >
                  {globalFilter ? t("table.nothingFound") : t("table.noDataFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 📑 Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1 pt-2">
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <div className="mr-3 text-[12px] text-[var(--text-secondary)]">
              {currentPage}/{totalPages} {t("table.pageLabel")}
            </div>

            <Pagination>
              <PaginationContent>
                {/* Oldingi sahifa */}
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {/* Birinchi sahifa va ellipsis */}
                {showStartEllipsis && (
                  <>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(1)}
                        className="cursor-pointer"
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {visiblePages[0] > 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

                {/* Ko'rinadigan sahifalar */}
                {visiblePages.map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={page === currentPage}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {/* Oxirgi sahifa va ellipsis */}
                {showEndEllipsis && (
                  <>
                    {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(totalPages)}
                        className="cursor-pointer"
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}

                {/* Keyingi sahifa */}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        {/* Chap tomon - ma'lumotlar va limit selector */}
        <div className="flex items-center space-x-4">
          {/* Data range display */}
          <div className="text-[13px] text-[#697181]">
            {dataCount > 0 ? (
              <>
                {t("table.showingRange", {
                  start: startItem,
                  end: endItem,
                  total: serverSide ? totalData : dataCount,
                })}
                {!serverSide && globalFilter && (
                  <span className="ml-1">
                    ({t("table.filteredFrom", { total: allData.length })})
                  </span>
                )}
              </>
            ) : (
              t("table.noData")
            )}
          </div>

          {/* Limit selector */}
          <div className="flex items-center space-x-2">
            <span className="text-[13px] text-[#697181]">{t("table.showLabel")}</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleLimitChange}>
              <SelectTrigger className="h-10 min-w-[84px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[13px] text-[var(--text-primary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[84px]">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="1000">{t("table.all", { defaultValue: "All" })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* O'ng tomon - pagination */}

      </div>
    </div>
  )
}
