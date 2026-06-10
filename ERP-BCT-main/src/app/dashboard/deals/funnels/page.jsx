"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Check, GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useDealStore } from "@/store/dealStore"
import { deleteFunnel, getContracts, updateFunnel } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"

const normalizeFunnel = (funnel, index, fallbackName) => {
  const fallback =
    typeof fallbackName === "function" ? fallbackName(index) : fallbackName
  if (!funnel || typeof funnel !== "object") {
    return {
      id: `funnel-${index}`,
      name: fallback,
      color: "#5B6FDD",
      comment: "",
      order: index + 1,
      orderInput: String(index + 1),
    }
  }

  const id =
    funnel.id ??
    funnel._id ??
    funnel.uuid ??
    funnel.guid ??
    funnel.ID ??
    funnel.Id ??
    funnel.code ??
    index + 1

  const order = Number(funnel.order ?? index + 1)
  const rawName = typeof funnel.name === "string" ? funnel.name.trim() : ""

  return {
    id: String(id),
    name: rawName || fallback,
    color: funnel.color || "#5B6FDD",
    comment: funnel.comment || "",
    order,
    orderInput: String(order),
  }
}

export default function FunnelSettingsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const funnels = useDealStore((state) => state.funnels)
  const funnelsLoading = useDealStore((state) => state.funnelsLoading)
  const loadFunnels = useDealStore((state) => state.loadFunnels)

  const [tableData, setTableData] = useState([])
  const [draggingId, setDraggingId] = useState("")
  const [savingOrder, setSavingOrder] = useState(false)
  const [savingRowId, setSavingRowId] = useState("")
  const [deletingId, setDeletingId] = useState("")
  const [editingId, setEditingId] = useState("")
  const [editValues, setEditValues] = useState({ name: "", color: "#5B6FDD", comment: "" })

  const normalizedFunnels = useMemo(() => {
    return funnels
      .map((funnel, index) =>
        normalizeFunnel(funnel, index, t("funnelPage.fallbackName", { index: index + 1 })),
      )
      .sort((a, b) => a.order - b.order)
  }, [funnels, t])

  useEffect(() => {
    loadFunnels()
  }, [loadFunnels])

  useEffect(() => {
    setTableData(normalizedFunnels)
  }, [normalizedFunnels])

  const persistTableOrder = useCallback(
    async (items, previous, notifyOnError = false) => {
      setSavingOrder(true)
      try {
        await Promise.all(
          items.map((item, index) => updateFunnel(item.id, { order: index + 1 })),
        )
        await loadFunnels(true)
      } catch (error) {
        console.error("Failed to persist order:", error)
        if (previous) {
          setTableData(previous)
        }
        if (notifyOnError) {
          toastError({
            title: t("funnelPage.toasts.orderError.title"),
            description: error?.message || t("funnelPage.toasts.orderError.description"),
          })
        }
      } finally {
        setSavingOrder(false)
      }
    },
    [loadFunnels, t],
  )

  const handleRowDragStart = (event, rowId) => {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", rowId)
    event.dataTransfer.setData("application/x-funnel-row", rowId)
    setDraggingId(rowId)
  }

  const handleRowDragOver = (event) => {
    if (event.dataTransfer.types.includes("application/x-funnel-row")) {
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
    }
  }

  const handleRowDragEnd = () => {
    setDraggingId("")
  }

  const handleRowDrop = (event, targetId) => {
    if (!event.dataTransfer.types.includes("application/x-funnel-row")) return
    event.preventDefault()
    const draggedId = event.dataTransfer.getData("application/x-funnel-row")
    if (!draggedId || draggedId === targetId) return

    setTableData((prev) => {
      const previous = prev.map((row) => ({ ...row }))
      const updated = prev.map((row) => ({ ...row }))
      const fromIndex = updated.findIndex((row) => row.id === draggedId)
      const toIndex = updated.findIndex((row) => row.id === targetId)
      if (fromIndex === -1 || toIndex === -1) return prev

      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)

      const recalculated = updated.map((row, index) => ({
        ...row,
        order: index + 1,
        orderInput: String(index + 1),
      }))

      persistTableOrder(recalculated, previous, false)
      return recalculated
    })
  }

  const handleOrderInputChange = (id, value) => {
    setTableData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, orderInput: value } : row)),
    )
  }

  const commitOrderChange = (id) => {
    const row = tableData.find((item) => item.id === id)
    if (!row) return

    const parsed = Number(row.orderInput)
    if (!Number.isFinite(parsed)) {
      toastWarning({
        title: t("funnelPage.toasts.invalidOrder.title"),
        description: t("funnelPage.toasts.invalidOrder.description"),
      })
      setTableData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, orderInput: String(item.order) } : item,
        ),
      )
      return
    }

    if (parsed === row.order) return

    setTableData((prev) => {
      const previous = prev.map((item) => ({ ...item }))
      const updated = prev.map((item) =>
        item.id === id
          ? { ...item, order: parsed, orderInput: String(parsed) }
          : item,
      )
      const sorted = updated
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((item, index) => ({
          ...item,
          order: index + 1,
          orderInput: String(index + 1),
        }))
      persistTableOrder(sorted, previous, true)
      return sorted
    })
  }

  const startEditing = (row) => {
    setEditingId(row.id)
    setEditValues({ name: row.name, color: row.color, comment: row.comment })
  }

  const cancelEditing = () => {
    setEditingId("")
    setEditValues({ name: "", color: "#5B6FDD", comment: "" })
  }

  const handleSaveRow = async (row) => {
    if (!editValues.name.trim()) {
      toastWarning({
        title: t("funnelPage.toasts.nameRequired.title"),
        description: t("funnelPage.toasts.nameRequired.description"),
      })
      return
    }

    setSavingRowId(row.id)
    try {
      await updateFunnel(row.id, {
        name: editValues.name.trim(),
        color: editValues.color,
        comment: editValues.comment.trim(),
        order: row.order,
      })
      toastSuccess({ title: t("funnelPage.toasts.updateSuccess.title") })
      cancelEditing()
      await loadFunnels(true)
    } catch (error) {
      console.error("Failed to update funnel:", error)
      toastError({
        title: t("funnelPage.toasts.updateError.title"),
        description: error?.message || t("funnelPage.toasts.updateError.description"),
      })
    } finally {
      setSavingRowId("")
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      const response = await getContracts({ funnel_id: id, limit: 1 })
      const raw = extractArrayFromResponse(response, ["contracts"])
      const fallback =
        (response && typeof response === "object" && response.data && Array.isArray(response.data))
          ? response.data
          : Array.isArray(response?.contracts)
            ? response.contracts
            : []
      const contracts = Array.isArray(raw) && raw.length > 0 ? raw : fallback
      if (contracts.length > 0) {
        toastWarning({
          title: t("funnelPage.toasts.deleteBlocked.title"),
          description: t("funnelPage.toasts.deleteBlocked.description"),
        })
        return
      }

      await deleteFunnel(id)
      toastSuccess({ title: t("funnelPage.toasts.deleteSuccess.title") })
      await loadFunnels(true)
    } catch (error) {
      console.error("Failed to delete funnel:", error)
      toastError({
        title: t("funnelPage.toasts.deleteError.title"),
        description: error?.message || t("funnelPage.toasts.deleteError.description"),
      })
    } finally {
      setDeletingId("")
    }
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("funnelPage.title")}</h1>
        <Link href="/dashboard/deals/funnels/add">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> {t("funnelPage.addButton")}
          </Button>
        </Link>
      </div>

      {funnelsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          {t("funnelPage.emptyState")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t("funnelPage.tableHeaders.order")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t("funnelPage.tableHeaders.name")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t("funnelPage.tableHeaders.color")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t("funnelPage.tableHeaders.comment")}
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t("funnelPage.tableHeaders.number")}
                  </th>
                  <th className="w-32 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t("funnelPage.tableHeaders.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableData.map((row) => {
                  const isEditing = editingId === row.id
                  const isSavingRow = savingRowId === row.id
                  const isDeletingRow = deletingId === row.id
                  const isDragging = draggingId === row.id
                  const displayName =
                    row.name && row.name.trim().length > 0
                      ? row.name
                      : t("funnelPage.fallbackName", { index: row.order })

                  return (
                    <tr
                      key={row.id}
                      draggable={!isEditing && !isSavingRow && !savingOrder}
                      onDragStart={(event) => handleRowDragStart(event, row.id)}
                      onDragOver={handleRowDragOver}
                      onDrop={(event) => handleRowDrop(event, row.id)}
                      onDragEnd={handleRowDragEnd}
                      className={isDragging ? "bg-gray-50" : ""}
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            min={1}
                            value={row.orderInput}
                            onChange={(event) => handleOrderInputChange(row.id, event.target.value)}
                            onBlur={() => commitOrderChange(row.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur()
                              }
                            }}
                            className="h-9 w-16"
                            disabled={savingOrder || isSavingRow}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {isEditing ? (
                          <Input
                            value={editValues.name}
                            onChange={(event) =>
                              setEditValues((prev) => ({ ...prev, name: event.target.value }))
                            }
                            className="h-10"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">{displayName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editValues.color}
                              onChange={(event) =>
                                setEditValues((prev) => ({ ...prev, color: event.target.value }))
                              }
                              className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                            />
                            <Input
                              value={editValues.color}
                              onChange={(event) =>
                                setEditValues((prev) => ({ ...prev, color: event.target.value }))
                              }
                              className="h-10"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span
                              className="h-5 w-5 rounded-full border border-gray-200"
                              style={{ backgroundColor: row.color }}
                              aria-label={t("funnelPage.colorPreview")}
                            />
                            <span className="text-sm text-gray-600">{row.color}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {isEditing ? (
                          <Textarea
                            value={editValues.comment}
                            onChange={(event) =>
                              setEditValues((prev) => ({ ...prev, comment: event.target.value }))
                            }
                            rows={2}
                          />
                        ) : (
                          <span className="text-sm text-gray-600">
                            {row.comment || t("funnelPage.noComment")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-gray-500">
                        {row.order}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 text-emerald-600"
                                onClick={() => handleSaveRow(row)}
                                disabled={isSavingRow}
                                aria-label={t("funnelPage.actions.save")}
                              >
                                {isSavingRow ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 text-gray-600"
                                onClick={cancelEditing}
                                disabled={isSavingRow}
                                aria-label={t("funnelPage.actions.cancel")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 text-gray-700"
                                onClick={() => router.push(`/dashboard/deals/funnels/${encodeURIComponent(row.id)}`)}
                                aria-label={t("funnelPage.actions.edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(row.id)}
                                disabled={isDeletingRow}
                                aria-label={t("funnelPage.actions.delete")}
                              >
                                {isDeletingRow ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {savingOrder && (
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 text-sm text-gray-600">
              {t("funnelPage.savingOrder")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
