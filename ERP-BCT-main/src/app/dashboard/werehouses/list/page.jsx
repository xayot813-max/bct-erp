"use client"

import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import BackLinkButton from "@/components/shared/BackLinkButton"
import { warehouseOptions as initialWarehouses } from "@/components/warehouse/warehouse-data"
import { createWarehouse, deleteWarehouse, getWarehouses, updateWarehouse } from "@/lib/actions"
import { toastError, toastSuccess } from "@/lib/toast"

const createDraft = (index, warehouseName, addressLabel) => ({
  id: `warehouse-draft-${index}`,
  name: warehouseName,
  address: `${addressLabel} ${index}`,
})

const isDraftId = (id = "") => id.startsWith("warehouse-draft-")

export default function WarehouseListPage() {
  const { t } = useTranslation("common")
  const translatedWarehouses = useMemo(
    () =>
      initialWarehouses.map((item) => ({
        ...item,
        name: t(item.nameKey || "", { defaultValue: item.fallbackName || item.name || item.id }),
      })),
    [t],
  )
  const [warehouses, setWarehouses] = useState(
    translatedWarehouses.map((item, index) => ({
      ...item,
      address: `${t("warehouse.address")} ${index + 1}`,
    })),
  )
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const [form, setForm] = useState(createDraft(1, t("warehouse.names.one"), t("warehouse.address")))
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const itemsPerPage = 5

  const draftWarehouseName = translatedWarehouses[0]?.name || t("warehouse.names.one")

  const normalizeWarehouses = (payload) => {
    const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
    return rows
      .map((item, index) => ({
        id: String(item.id || item._id || `warehouse-${index + 1}`),
        name: item.name || `${t("warehouse.names.one")} ${index + 1}`,
        address: item.address || "",
        comment: item.comment || "",
        is_active: item.is_active !== false,
      }))
      .filter((item) => item.id && item.name)
  }

  const fallbackWarehouses = () =>
    translatedWarehouses.map((item, index) => ({
      ...item,
      address: `${t("warehouse.address")} ${index + 1}`,
      comment: "",
      is_active: true,
    }))

  const loadWarehouses = async () => {
    setIsLoading(true)
    try {
      const response = await getWarehouses({ limit: 500 })
      const normalized = normalizeWarehouses(response)
      const nextWarehouses = normalized.length > 0 ? normalized : fallbackWarehouses()
      setWarehouses(nextWarehouses)
      if (!selectedId && nextWarehouses[0]) {
        setSelectedId(nextWarehouses[0].id)
        setForm({
          id: nextWarehouses[0].id,
          name: nextWarehouses[0].name,
          address: nextWarehouses[0].address || "",
          comment: nextWarehouses[0].comment || "",
          is_active: nextWarehouses[0].is_active !== false,
        })
      }
    } catch (error) {
      console.error("Failed to load warehouses:", error)
      setWarehouses(fallbackWarehouses())
      toastError({
        title: t("warehouse.messages.backendUnavailable.title"),
        description: t("warehouse.messages.backendUnavailable.homeFallback"),
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWarehouses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setForm((prev) =>
      isDraftId(prev.id)
        ? createDraft(
            Number(prev.id.replace("warehouse-draft-", "")) || 1,
            draftWarehouseName,
            t("warehouse.address"),
          )
        : prev,
    )
  }, [draftWarehouseName, t])

  const filteredWarehouses = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return warehouses
    return warehouses.filter((item) =>
      [item.name, item.address].join(" ").toLowerCase().includes(query),
    )
  }, [search, warehouses])

  const totalPages = Math.max(1, Math.ceil(filteredWarehouses.length / itemsPerPage))

  const visibleWarehouses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredWarehouses.slice(start, start + itemsPerPage)
  }, [currentPage, filteredWarehouses])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const syncSelection = (id) => {
    const target = warehouses.find((item) => item.id === id)
    if (!target) return
    setSelectedId(id)
    setForm({
      id: target.id,
      name: target.name,
      address: target.address || "",
      comment: target.comment || "",
      is_active: target.is_active !== false,
    })
  }

  const handleNewWarehouse = () => {
    const draft = createDraft(warehouses.length + 1, draftWarehouseName, t("warehouse.address"))
    setSelectedId("")
    setForm(draft)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) return

    const editingExisting = selectedId && warehouses.some((item) => item.id === selectedId)
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      comment: form.comment?.trim() || "",
      is_active: form.is_active !== false,
    }

    setIsSaving(true)
    try {
      if (editingExisting) {
        const updated = await updateWarehouse(selectedId, payload)
        const normalized = normalizeWarehouses([updated])[0] || { id: selectedId, ...payload }
        setWarehouses((prev) =>
          prev.map((item) => (item.id === selectedId ? normalized : item)),
        )
        setForm(normalized)
        toastSuccess({ title: t("warehouse.messages.listUpdated") })
      } else {
        const created = await createWarehouse(payload)
        const normalized = normalizeWarehouses([created])[0]
        if (!normalized) throw new Error("Invalid warehouse response")
        setWarehouses((prev) => [...prev, normalized])
        setSelectedId(normalized.id)
        setForm(normalized)
        toastSuccess({ title: t("warehouse.messages.listCreated") })
      }
    } catch (error) {
      toastError({
        title: editingExisting
          ? t("warehouse.messages.updateError", { defaultValue: "Не удалось обновить склад" })
          : t("warehouse.messages.createError", { defaultValue: "Не удалось создать склад" }),
        description: error?.message || "",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!id || isSaving) return
    setIsSaving(true)
    try {
      await deleteWarehouse(id)
      const remainingWarehouses = warehouses.filter((item) => item.id !== id)
      setWarehouses(remainingWarehouses)
      setSelectedId((current) => {
        if (current !== id) return current
        const fallback = remainingWarehouses[0]
        if (fallback) {
          setForm({
            id: fallback.id,
            name: fallback.name,
            address: fallback.address || "",
            comment: fallback.comment || "",
            is_active: fallback.is_active !== false,
          })
          return fallback.id
        }
        const draft = createDraft(1, draftWarehouseName, t("warehouse.address"))
        setForm(draft)
        return ""
      })
      toastSuccess({ title: t("warehouse.messages.listDeleted") })
    } catch (error) {
      toastError({
        title: t("warehouse.messages.deleteError", { defaultValue: "Не удалось удалить склад" }),
        description: error?.message || "",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    const selected = warehouses.find((item) => item.id === selectedId)
    if (selected) {
      setForm({
        id: selected.id,
        name: selected.name,
        address: selected.address || "",
        comment: selected.comment || "",
        is_active: selected.is_active !== false,
      })
      return
    }
    setForm(createDraft(warehouses.length + 1, draftWarehouseName, t("warehouse.address")))
    setSelectedId("")
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-3">
      <div className="mb-4 flex items-start justify-between gap-5">
        <div className="flex items-center gap-3">
          <BackLinkButton href="/dashboard/werehouses" />
          <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">{t("warehouse.pageTitle")}</h1>
        </div>
        <div className="relative w-full max-w-[305px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-[36px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface)] pl-9 pr-3 text-[12px] text-[var(--text-primary)]"
            placeholder={t("table.searchPlaceholder")}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <div className="overflow-x-auto px-3 pt-3">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[12px] text-[var(--text-primary)]">
            <thead>
              <tr className="text-[var(--text-secondary)]">
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-3 text-left font-normal">#</th>
                <th className="border-b border-r border-[var(--border-subtle)] px-4 py-3 text-left font-normal">{t("products.columns.name")}</th>
                <th className="border-b border-[var(--border-subtle)] px-4 py-3 text-left font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                    {t("common.loading", { defaultValue: "Загрузка..." })}
                  </td>
                </tr>
              )}
              {!isLoading && visibleWarehouses.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                    {t("warehouse.table.emptyProducts")}
                  </td>
                </tr>
              )}
              {!isLoading && visibleWarehouses.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-elevated)]"}>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-3">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="border-r border-[var(--border-subtle)] px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => syncSelection(item.id)}
                        className={`flex h-[40px] w-[30px] items-center justify-center rounded-[7px] border text-[var(--text-primary)] hover:bg-[var(--surface-hover)] ${
                          selectedId === item.id
                            ? "border-[var(--accent)] bg-[var(--surface-hover)]"
                            : "border-[var(--border-default)] bg-[var(--surface-elevated)]"
                        }`}
                        title={t("warehouse.actions.edit", { defaultValue: "Редактировать" })}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={isSaving}
                        className="flex h-[40px] w-[30px] items-center justify-center rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                        title={t("warehouse.actions.delete", { defaultValue: "Удалить" })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-[var(--text-secondary)]">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 transition ${
              currentPage === 1
                ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-muted)] opacity-60"
                : "cursor-pointer border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              type="button"
              key={page}
              onClick={() => handlePageChange(page)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 transition ${
                page === currentPage
                  ? "border-[var(--accent)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                  : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 transition ${
              currentPage === totalPages
                ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-muted)] opacity-60"
                : "cursor-pointer border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            ›
          </button>
          <div className="ml-4 flex h-8 w-[105px] items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[var(--text-primary)]">
            {itemsPerPage}
          </div>
          <span>/{t("table.pageLabel")}</span>
        </div>
      </div>

      <div className="mt-6 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-7 shadow-[var(--surface-shadow)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-[44px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {selectedId
              ? t("warehouse.actions.edit", { defaultValue: "Редактировать" })
              : t("warehouse.actions.create", { defaultValue: "Создать" })}
          </h2>
          {selectedId && (
            <button
              type="button"
              onClick={handleNewWarehouse}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              <Plus className="h-4 w-4" />
              {t("warehouse.actions.new", { defaultValue: "Новый склад" })}
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">{t("products.columns.name")}<span className="text-[var(--danger)]">*</span></label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="h-[36px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">{t("warehouse.address")}<span className="text-[var(--danger)]">*</span></label>
            <input
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              className="h-[36px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">{t("common.comment", { defaultValue: "Комментарий" })}</label>
            <textarea
              value={form.comment || ""}
              onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
              className="min-h-[72px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-[12px] text-[var(--text-primary)]"
            />
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={form.is_active !== false}
              onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
              className="h-4 w-4"
            />
            {t("settings.access.active", { defaultValue: "Активен" })}
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 rounded-[8px] bg-[var(--accent)] px-5 text-[12px] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
            >
              {selectedId
                ? t("warehouse.actions.save", { defaultValue: "СОХРАНИТЬ" })
                : t("warehouse.actions.create")}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="h-9 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-5 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
    </div>
  )
}
