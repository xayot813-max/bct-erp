 "use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ChevronRight, Edit, Loader2, Plus, Search, Settings, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useDealStore } from "@/store/dealStore"
import { deleteContract, getContracts, updateContractFunnel, updateFunnel } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { toastError, toastSuccess } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"

const UNASSIGNED_COLUMN_ID = "unassigned"
const UNASSIGNED_COLOR = "#E2E8F0"
const COLUMN_DRAG_TYPE = "application/x-kanban-column"
const CARD_DRAG_TYPE = "application/x-kanban-card"
const ZERO_OBJECT_ID = "000000000000000000000000"
const FALLBACK_FUNNEL_DEFS = [
  { id: "fallback-new-lead", nameKey: "dealPage.funnels.newLead", color: "#6B5CE7", order: 1 },
  { id: "fallback-meeting", nameKey: "dealPage.funnels.meeting", color: "#D9485F", order: 2 },
  { id: "fallback-offer", nameKey: "dealPage.funnels.offer", color: "#7DC94D", order: 3 },
  { id: "fallback-decision", nameKey: "dealPage.funnels.decision", color: "#F0C541", order: 4 },
  { id: "fallback-shipping", nameKey: "dealPage.funnels.shipping", color: "#EF4444", order: 5 },
]
const FUNNEL_NAME_TRANSLATION_KEYS = [
  {
    key: "dealPage.unassignedColumn",
    names: ["без стадии", "no stage", "bosqichsiz"],
  },
  {
    key: "dealPage.funnels.newLead",
    names: ["новый лид", "new lead", "yangi lid"],
  },
  {
    key: "dealPage.funnels.meeting",
    names: ["встреча / презентация", "meeting / presentation", "uchrashuv / prezentatsiya"],
  },
  {
    key: "dealPage.funnels.offer",
    names: ["кп и защита", "proposal & defense", "kp va himoya"],
  },
  {
    key: "dealPage.funnels.decision",
    names: ["принимает решения", "decision maker", "qaror qabul qiladi"],
  },
  {
    key: "dealPage.funnels.shipping",
    names: ["отгрузка", "shipping", "yuklash"],
  },
]

const normalizeFunnelId = (value) => {
  if (value === null || value === undefined) return ""
  const stringified = String(value).trim()
  if (
    !stringified ||
    stringified === ZERO_OBJECT_ID ||
    stringified === "null" ||
    stringified === "undefined"
  ) {
    return ""
  }
  return stringified
}

const hexToRgb = (hex) => {
  if (!hex) return { r: 91, g: 111, b: 221 }
  const normalized = hex.replace("#", "")
  const bigint = parseInt(normalized, 16)
  if (Number.isNaN(bigint)) {
    return { r: 91, g: 111, b: 221 }
  }
  if (normalized.length === 3) {
    const r = (bigint >> 8) & 0xf
    const g = (bigint >> 4) & 0xf
    const b = bigint & 0xf
    return {
      r: (r << 4) | r,
      g: (g << 4) | g,
      b: (b << 4) | b,
    }
  }
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

const mixWithWhite = (hex, alpha = 0.72) => {
  const { r, g, b } = hexToRgb(hex)
  const mix = (channel) => Math.round(channel + (255 - channel) * (1 - alpha))
  return `rgba(${mix(r)}, ${mix(g)}, ${mix(b)}, 1)`
}

const contractFunnelId = (contract) => {
  if (!contract) return ""
  const direct =
    contract.funnel_id ??
    contract.funnelId ??
    contract.stage_id ??
    contract.stageId ??
    contract.pipeline_id ??
    contract.pipelineId
  const normalizedDirect = normalizeFunnelId(direct)
  if (normalizedDirect) return normalizedDirect
  if (contract.funnel && typeof contract.funnel === "object") {
    const funnel = contract.funnel
    return normalizeFunnelId(
      funnel.id ??
        funnel._id ??
        funnel.uuid ??
        funnel.guid ??
        funnel.ID ??
        funnel.Id ??
        funnel.code,
    )
  }
  return ""
}

const contractClientName = (contract) => {
  if (!contract) return "—"
  if (typeof contract.client === "string") return contract.client
  if (contract.client && typeof contract.client === "object") {
    const client = contract.client
    const first = client.first_name || client.firstname || client.firstName || ""
    const last = client.last_name || client.lastname || client.lastName || ""
    const full = [first, last].filter(Boolean).join(" ").trim()
    if (full) return full
    return client.name || client.company || "—"
  }
  return contract.client_name || contract.client_full_name || contract.customer || "—"
}

const contractIdentifier = (contract, fallback = "Deal") => {
  return (
    contract.contract_number ||
    contract.contractNumber ||
    contract.number ||
    contract.code ||
    contract.id ||
    contract._id ||
    fallback
  )
}

const contractTitle = (contract, t, fallback = "Deal") => {
  const identifier = contractIdentifier(contract, fallback)
  return t("dealPage.defaultDealLabel", {
    number: identifier,
    defaultValue: `${fallback} #${identifier}`,
  })
}

const contractComment = (contract) => {
  return contract.comment || contract.description || "—"
}

const contractDate = (contract) => {
  const raw =
    contract.deal_date ||
    contract.updated_at ||
    contract.updatedAt ||
    contract.created_at ||
    contract.createdAt
  if (!raw) return "—"
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString()
}

const contractAmount = (contract) => {
  const value = Number(contract.contract_amount ?? contract.amount ?? 0)
  if (!value) return "0"
  return value.toLocaleString()
}

const resolveContractId = (contract) => {
  return (
    (contract?.id && String(contract.id)) ||
    (contract?._id && String(contract._id)) ||
    (contract?.contract_id && String(contract.contract_id)) ||
    (contract?.contractId && String(contract.contractId)) ||
    ""
  )
}

const normalizeFunnelNameForLocale = (name, t) => {
  const trimmedName = typeof name === "string" ? name.trim() : ""
  if (!trimmedName) return ""

  const normalizedName = trimmedName.toLowerCase()
  const knownName = FUNNEL_NAME_TRANSLATION_KEYS.find((item) =>
    item.names.includes(normalizedName),
  )
  if (knownName) {
    return t(knownName.key, { defaultValue: trimmedName })
  }

  const generatedFunnelMatch = normalizedName.match(/^(?:voronka|воронка|pipeline)\s*(\d+)$/i)
  if (generatedFunnelMatch) {
    return t("dealPage.generatedFunnelName", {
      number: generatedFunnelMatch[1],
      defaultValue: trimmedName,
    })
  }

  return trimmedName
}

export default function DealsPage() {
  const { t } = useTranslation()
  const defaultDealLabel = t("dealPage.defaultDealName")
  const router = useRouter()
  const funnels = useDealStore((state) => state.funnels)
  const funnelsLoading = useDealStore((state) => state.funnelsLoading)
  const loadFunnels = useDealStore((state) => state.loadFunnels)
  const loadReferenceData = useDealStore((state) => state.loadReferenceData)

  const [contracts, setContracts] = useState([])
  const [contractsLoading, setContractsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [columnOrder, setColumnOrder] = useState([UNASSIGNED_COLUMN_ID])
  const [savingColumnOrder, setSavingColumnOrder] = useState(false)
  const [movingContractId, setMovingContractId] = useState("")
  const [draggingContractId, setDraggingContractId] = useState("")
  const [deletingContractId, setDeletingContractId] = useState("")

  useEffect(() => {
    loadReferenceData()
    loadFunnels()
  }, [loadReferenceData, loadFunnels])

  useEffect(() => {
    let cancelled = false

    const loadContracts = async () => {
      setContractsLoading(true)
      try {
        const response = await getContracts({ limit: 200 })
        const raw = extractArrayFromResponse(response, ["contracts"])
        if (!cancelled) {
          setContracts(Array.isArray(raw) ? raw : [])
        }
      } catch (error) {
        console.error("Error loading contracts:", error)
        if (!cancelled) {
          toastError({
            title: t("dealPage.loadErrorTitle"),
            description: error?.message,
          })
        }
      } finally {
        if (!cancelled) {
          setContractsLoading(false)
        }
      }
    }

    loadContracts()

    return () => {
      cancelled = true
    }
  }, [t])

  const sortedFunnels = useMemo(() => {
    return funnels
      .map((funnel) => ({
        ...funnel,
        id: String(funnel.id ?? funnel._id ?? funnel.uuid ?? funnel.guid ?? ""),
        name: normalizeFunnelNameForLocale(funnel.name, t),
        color: funnel.color || "#5B6FDD",
      }))
      .filter((funnel) => funnel.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [funnels, t])

  const fallbackFunnels = useMemo(
    () =>
      FALLBACK_FUNNEL_DEFS.map((item) => ({
        id: item.id,
        name: t(item.nameKey),
        color: item.color,
        order: item.order,
      })),
    [t],
  )

  const effectiveFunnels = useMemo(() => {
    if (sortedFunnels.length > 0) return sortedFunnels
    return fallbackFunnels
  }, [fallbackFunnels, sortedFunnels])

  const usingFallbackFunnels = sortedFunnels.length === 0

  const funnelById = useMemo(() => {
    const map = new Map()
    effectiveFunnels.forEach((funnel) => {
      map.set(funnel.id, funnel)
    })
    return map
  }, [effectiveFunnels])

  const defaultOrder = useMemo(
    () =>
      usingFallbackFunnels
        ? effectiveFunnels.map((funnel) => funnel.id)
        : [UNASSIGNED_COLUMN_ID, ...effectiveFunnels.map((funnel) => funnel.id)],
    [effectiveFunnels, usingFallbackFunnels],
  )

  useEffect(() => {
    setColumnOrder((prev) => {
      const seen = new Set(defaultOrder)
      const preserved = prev.filter((id) => seen.has(id))
      const missing = defaultOrder.filter((id) => !preserved.includes(id))
      const next = preserved.length > 0 ? [...preserved, ...missing] : defaultOrder
      return next
    })
  }, [defaultOrder])

  const filteredContracts = useMemo(() => {
    if (!searchTerm) return contracts
    const lowered = searchTerm.toLowerCase()
    return contracts.filter((contract) => {
      const searchable = [
        contractIdentifier(contract, defaultDealLabel),
        contractClientName(contract),
        contractComment(contract),
      ]
        .join(" ")
        .toLowerCase()
      return searchable.includes(lowered)
    })
  }, [contracts, searchTerm, defaultDealLabel])


  const columns = useMemo(() => {
    return columnOrder
      .map((columnId) => {
        if (columnId === UNASSIGNED_COLUMN_ID) {
          const deals = filteredContracts.filter((contract) => !contractFunnelId(contract))
          return {
            id: UNASSIGNED_COLUMN_ID,
            name: t("dealPage.unassignedColumn"),
            color: UNASSIGNED_COLOR,
            comment: null,
            order: -1,
            isUnassigned: true,
            deals,
          }
        }

        const funnel = funnelById.get(columnId)
        if (!funnel) return null
        const deals = usingFallbackFunnels
          ? columnId === effectiveFunnels[0]?.id
            ? filteredContracts
            : []
          : filteredContracts.filter((contract) => contractFunnelId(contract) === funnel.id)

        return {
          id: funnel.id,
          name: funnel.name,
          color: funnel.color || "#5B6FDD",
          comment: funnel.comment,
          order: funnel.order ?? 0,
          isUnassigned: false,
          deals,
          isFallbackLead: usingFallbackFunnels && columnId === effectiveFunnels[0]?.id,
        }
      })
      .filter(Boolean)
  }, [columnOrder, effectiveFunnels, filteredContracts, funnelById, t, usingFallbackFunnels])

  const hasVisibleDeals = filteredContracts.length > 0

  const isLoading = funnelsLoading || contractsLoading

  const persistFunnelOrder = useCallback(
    async (orderedIds, previousOrder) => {
      const orderedFunnelIds = orderedIds.filter((id) => id !== UNASSIGNED_COLUMN_ID)
      const payload = orderedFunnelIds.map((id, index) => ({
        id,
        order: index + 1,
      }))

      if (payload.length === 0) return

      setSavingColumnOrder(true)
      try {
        await Promise.all(payload.map(({ id, order }) => updateFunnel(id, { order })))
      } catch (error) {
        console.error("Failed to persist funnel order:", error)
        setColumnOrder(previousOrder)
      } finally {
        setSavingColumnOrder(false)
      }
    },
    [],
  )

  const handleColumnDragStart = useCallback((event, columnId) => {
    if (columnId === UNASSIGNED_COLUMN_ID) return
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData(COLUMN_DRAG_TYPE, columnId)
    event.dataTransfer.setData("text/plain", columnId)
  }, [])

  const handleColumnDragOver = useCallback((event) => {
    if (event.dataTransfer.types.includes(COLUMN_DRAG_TYPE)) {
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
    }
  }, [])

  const handleColumnDrop = useCallback(
    (event, targetColumnId) => {
      if (!event.dataTransfer.types.includes(COLUMN_DRAG_TYPE)) return
      event.preventDefault()
      const draggedId = event.dataTransfer.getData(COLUMN_DRAG_TYPE)
      if (!draggedId || draggedId === targetColumnId) return
      if (draggedId === UNASSIGNED_COLUMN_ID || targetColumnId === UNASSIGNED_COLUMN_ID) return

      setColumnOrder((prev) => {
        const previousOrder = [...prev]
        const withoutUnassigned = prev.filter((id) => id !== UNASSIGNED_COLUMN_ID)
        const filteredDragged = withoutUnassigned.filter((id) => id !== draggedId)
        const targetIndex = filteredDragged.indexOf(targetColumnId)
        if (targetIndex === -1) return prev
        filteredDragged.splice(targetIndex, 0, draggedId)
        const nextOrder = [UNASSIGNED_COLUMN_ID, ...filteredDragged]
        persistFunnelOrder(nextOrder, previousOrder)
        return nextOrder
      })
    },
    [persistFunnelOrder],
  )

  const moveContractToColumn = useCallback(
    async (contractId, fromColumnId, toColumnId) => {
      if (!contractId || fromColumnId === toColumnId) return
      const isUnassignedTarget = toColumnId === UNASSIGNED_COLUMN_ID
      const targetFunnelId = isUnassignedTarget ? ZERO_OBJECT_ID : toColumnId
      const targetFunnel =
        !isUnassignedTarget && targetFunnelId ? funnelById.get(targetFunnelId) : null

      let previousContractsState = []
      setContracts((prev) => {
        previousContractsState = prev
        return prev.map((contract) => {
          if (resolveContractId(contract) !== contractId) return contract
          return {
            ...contract,
            funnel_id: targetFunnelId,
            funnelId: targetFunnelId,
            funnel: targetFunnel ? { ...targetFunnel } : undefined,
          }
        })
      })

      setMovingContractId(contractId)
      if (usingFallbackFunnels) {
        setMovingContractId("")
        return
      }
      try {
        await updateContractFunnel(contractId, targetFunnelId)
      } catch (error) {
        console.error("Failed to move contract:", error)
        setContracts(previousContractsState)
      } finally {
        setMovingContractId("")
      }
    },
    [contracts, funnelById, updateContractFunnel, usingFallbackFunnels],
  )

  const handleCardDragOver = useCallback((event) => {
    if (event.dataTransfer.types.includes(CARD_DRAG_TYPE)) {
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
    }
  }, [])

  const handleCardDrop = useCallback(
    (event, targetColumnId) => {
      if (!event.dataTransfer.types.includes(CARD_DRAG_TYPE)) return
      event.preventDefault()
      try {
        const payload = JSON.parse(event.dataTransfer.getData(CARD_DRAG_TYPE) || "{}")
        const contractId = payload.contractId ? String(payload.contractId) : ""
        const fromColumnId = payload.fromColumnId || UNASSIGNED_COLUMN_ID
        if (!contractId) return
        moveContractToColumn(contractId, fromColumnId, targetColumnId)
      } catch (error) {
        console.error("Failed to parse drag payload:", error)
      } finally {
        setDraggingContractId("")
      }
    },
    [moveContractToColumn],
  )

  const handleCardDragStart = useCallback(
    (event, contract, currentColumnId) => {
      const contractId = resolveContractId(contract)
      if (!contractId) return
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData(
        CARD_DRAG_TYPE,
        JSON.stringify({ contractId, fromColumnId: currentColumnId }),
      )
      event.dataTransfer.setData("text/plain", contractIdentifier(contract, defaultDealLabel))
      setDraggingContractId(contractId)
    },
    [defaultDealLabel],
  )

  const handleCardDragEnd = useCallback(() => {
    setDraggingContractId("")
  }, [])

  const handleOpenSettings = () => {
    router.push("/dashboard/deals/funnels")
  }

  const handleEditContract = useCallback(
    (contract) => {
      const contractId = resolveContractId(contract)
      if (!contractId) return
      router.push(`/dashboard/deals/add?contractId=${encodeURIComponent(contractId)}&type=edit`)
    },
    [router],
  )

  const handleDeleteContract = useCallback(
    async (contract) => {
      const contractId = resolveContractId(contract)
      if (!contractId) return

      setDeletingContractId(contractId)
      try {
        await deleteContract(contractId)
        setContracts((prev) => prev.filter((item) => resolveContractId(item) !== contractId))
        toastSuccess({ title: t("dealPage.deleteSuccessTitle") })
      } catch (error) {
        console.error("Failed to delete contract:", error)
        toastError({
          title: t("dealPage.deleteErrorTitle"),
          description: error?.message,
        })
      } finally {
        setDeletingContractId("")
      }
    },
    [],
  )

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-6 flex min-w-0 items-center gap-4">
        <BackLinkButton href="/dashboard" />
        <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
          {t("dealPage.title")}
        </h1>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-[280px] shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder={t("dealPage.searchPlaceholder")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-[40px] rounded-[10px] border-[var(--border-default)] bg-[var(--surface-elevated)] pl-10 pr-3 text-[14px] font-normal text-[var(--text-primary)] shadow-sm placeholder:text-[var(--text-muted)] placeholder:opacity-100 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <Button variant="outline" onClick={handleOpenSettings} className="h-[40px] rounded-[10px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-5 text-[13px] font-medium text-[var(--text-secondary)] shadow-sm hover:bg-[var(--surface-hover)]">
            {t("dealPage.openSettings")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div
          className="grid items-start gap-4 pb-6"
          style={{
            gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((column) => {
            const columnColor = column.color || "#5B6FDD"
            const cardColor = column.isUnassigned ? "var(--surface-elevated)" : mixWithWhite(columnColor, 0.78)
            const columnTotal = column.deals
              .reduce((acc, deal) => acc + Number(deal.contract_amount ?? deal.amount ?? 0), 0)
              .toLocaleString()
            const dealCountLabel = t("dealPage.dealCount", { count: column.deals.length })
            const summaryLabel = t("dealPage.columnSummary", {
              dealCount: dealCountLabel,
              total: columnTotal,
            })

            const headerClasses =
              column.isUnassigned || usingFallbackFunnels
                ? "cursor-default"
                : savingColumnOrder
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-move"

            return (
              <div key={column.id} className="flex min-w-0 flex-col gap-3" data-column-id={column.id}>
                <div
                  className={`grid min-h-[82px] grid-rows-[40px_16px_2px] items-start rounded-[10px] border border-transparent px-3 py-2 text-center ${headerClasses}`}
                  draggable={!column.isUnassigned && !usingFallbackFunnels && !savingColumnOrder}
                  onDragStart={(event) => handleColumnDragStart(event, column.id)}
                  onDragOver={handleColumnDragOver}
                  onDrop={(event) => handleColumnDrop(event, column.id)}
                >
                  <div className="flex h-full items-end justify-center">
                    <h2 className="text-center text-[15px] font-semibold uppercase leading-[1.1] tracking-wide text-[var(--text-primary)]">
                      {column.name}
                    </h2>
                  </div>
                  <p className="text-[12px] leading-none text-[var(--text-secondary)]">{summaryLabel}</p>
                  <div
                    className="h-[2px] w-full"
                    style={{ backgroundColor: columnColor }}
                  />
                </div>

                {(column.isUnassigned || column.isFallbackLead) && (
                  <Link
                    href={
                      column.id && column.id !== UNASSIGNED_COLUMN_ID
                        ? `/dashboard/deals/add?funnelId=${encodeURIComponent(column.id)}`
                        : "/dashboard/deals/add"
                    }
                    aria-label={t("dealPage.addDealToColumn", { defaultValue: "Add deal" })}
                    className="flex h-[64px] items-center justify-center rounded-[10px] border border-dashed border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] transition hover:border-[var(--accent-hover)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  >
                    <Plus className="h-6 w-6" />
                  </Link>
                )}

                <div
                  className="flex min-h-[176px] flex-col gap-3 rounded-[10px] border border-transparent p-0 transition"
                  data-column-id={column.id}
                  onDragOver={handleCardDragOver}
                  onDrop={(event) => handleCardDrop(event, column.id)}
                >
                  {column.deals.length === 0 ? (
                    <div className="rounded-[10px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-8 text-center shadow-none">
                      <div className="text-[13px] leading-7 text-[var(--text-secondary)]">
                        {column.isUnassigned
                          ? t("dealPage.unassignedEmptyHint")
                          : usingFallbackFunnels
                            ? t("dealPage.fallbackEmptyHint")
                            : t("dealPage.emptyColumnHint")}
                      </div>
                    </div>
                  ) : (
                    column.deals.map((deal) => {
                      const contractId = resolveContractId(deal)
                      const isDragging = draggingContractId === contractId
                      const isUpdating = movingContractId === contractId
                      const isDeleting = deletingContractId === contractId
                      return (
                        <div
                          key={contractId || contractIdentifier(deal, defaultDealLabel)}
                          className={`group rounded-[3px] border px-2 py-1.5 shadow-sm transition ${isDragging ? "opacity-60" : ""}`}
                          style={{
                            backgroundColor: cardColor,
                            borderColor: column.isUnassigned ? "#F1F5F9" : `${columnColor}55`,
                          }}
                          draggable={!isUpdating}
                          onDragStart={(event) => handleCardDragStart(event, deal, column.id)}
                          onDragEnd={handleCardDragEnd}
                          onDragOver={handleCardDragOver}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] leading-none text-[var(--text-secondary)]">
                                {contractClientName(deal)}
                              </p>
                              <p className="mt-1 text-[12px] font-semibold leading-none text-[var(--text-primary)]">
                                {contractTitle(deal, t, defaultDealLabel)}
                              </p>
                            </div>
                            <span className="text-[11px] text-[var(--text-secondary)]">{contractDate(deal)}</span>
                          </div>
                          <div className="mt-2 text-[11px] leading-4 text-[var(--text-secondary)]">
                            {contractComment(deal)}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-primary)]">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                                onClick={() => router.push(`/dashboard/deals/add?contractId=${encodeURIComponent(contractId)}&type=edit`)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                                onClick={() => handleEditContract(deal)}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t("dealPage.deleteDialog.title")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("dealPage.deleteDialog.description")}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteContract(deal)}>
                                      {t("dealPage.deleteDialog.confirm")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            <span>{t("dealPage.noTasks")}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                            <span>{contractAmount(deal)}$</span>
                            <div className="opacity-0 transition group-hover:opacity-100">
                              <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                                {t("dealPage.moveLabel")}
                              </span>
                            </div>
                          </div>
                          {isUpdating && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>{t("dealPage.updating")}</span>
                            </div>
                          )}
                          {isDeleting && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>{t("common.deleting")}</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {(column.isUnassigned || column.isFallbackLead) && (
                  <div className="rounded-[8px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-center text-[12px] leading-6 text-[var(--text-secondary)] shadow-none">
                    {column.isUnassigned
                      ? t("dealPage.unassignedFooter")
                      : t("dealPage.fallbackLeadFooter")}
                  </div>
                )}
              </div>
            )
          })}

          {columns.length === 0 && (
            <div className="flex h-60 w-full items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-elevated)] text-center text-[var(--text-secondary)]">
              {t("dealPage.noFunnelsHint")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
