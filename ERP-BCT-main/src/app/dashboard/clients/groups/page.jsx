"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Building2, Search, Settings2, Star, Trash2, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  createCustomerGroup,
  deleteCustomerGroup,
  getCustomerGroupAnalytics,
  getCustomerGroups,
  updateCustomerGroup,
} from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toastError, toastSuccess } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const emptyGroupDraft = {
  id: "",
  name: "",
  code: "",
  color: "#4F8CFF",
  description: "",
  pricing_profile: "",
  discount_policy_ref: "",
  priority: "100",
}

const localizeCustomerGroupName = (group, t) => {
  const code = typeof group?.code === "string" ? group.code.trim().toLowerCase() : ""
  if (!code) return group?.name || "—"
  return t(`clientsPage.groups.names.${code}`, { defaultValue: group?.name || code })
}

function GroupManagementDialog({ groups, onSaved, onDeleted }) {
  const { t } = useTranslation("common")
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(emptyGroupDraft)
  const [submitting, setSubmitting] = useState(false)

  const resetDraft = () => setDraft(emptyGroupDraft)

  const handleSubmit = async () => {
    if (!draft.name.trim()) {
      toastError({ title: t("clientsPage.groups.validationTitle", { defaultValue: "Group name is required" }) })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: draft.name.trim(),
        code: draft.code.trim(),
        color: draft.color,
        description: draft.description.trim(),
        pricing_profile: draft.pricing_profile.trim(),
        discount_policy_ref: draft.discount_policy_ref.trim(),
        priority: Number(draft.priority || 100),
        is_active: true,
      }

      if (draft.id) {
        await updateCustomerGroup(draft.id, payload)
        toastSuccess({ title: t("clientsPage.groups.updated", { defaultValue: "Customer group updated" }) })
      } else {
        await createCustomerGroup(payload)
        toastSuccess({ title: t("clientsPage.groups.created", { defaultValue: "Customer group created" }) })
      }

      resetDraft()
      await onSaved?.()
    } catch (error) {
      toastError({
        title: t("clientsPage.groups.saveError", { defaultValue: "Failed to save group" }),
        description: error?.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (group) => {
    if (!group?.id || group.is_system) return
    setSubmitting(true)
    try {
      await deleteCustomerGroup(group.id)
      toastSuccess({ title: t("clientsPage.groups.deleted", { defaultValue: "Customer group deleted" }) })
      if (draft.id === group.id) {
        resetDraft()
      }
      await onDeleted?.()
    } catch (error) {
      toastError({
        title: t("clientsPage.groups.deleteError", { defaultValue: "Failed to delete group" }),
        description: error?.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-[36px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
          <Settings2 className="mr-2 h-4 w-4" />
          {t("clientsPage.groups.manageButton", { defaultValue: "Manage groups" })}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[1080px] gap-0 rounded-[18px] border-[var(--border-default)] bg-[var(--surface)] p-0 text-[var(--text-primary)]" mark="true">
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-[var(--border-default)] p-6 lg:border-b-0 lg:border-r">
            <DialogHeader className="pt-0 text-left">
              <DialogTitle>{t("clientsPage.groups.dialogTitle", { defaultValue: "Customer groups" })}</DialogTitle>
              <DialogDescription className="text-[var(--text-secondary)]">
                {t("clientsPage.groups.dialogDescription", { defaultValue: "System segments for CRM analytics, future pricing and discount policies." })}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="flex items-start justify-between gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full px-2 py-0.5 text-[11px] text-[var(--text-primary)]"
                        style={group.color ? { borderColor: `${group.color}66`, backgroundColor: `${group.color}12` } : undefined}
                      >
                        {localizeCustomerGroupName(group, t)}
                      </Badge>
                      {group.is_system && (
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                          {t("clientsPage.groups.system", { defaultValue: "System" })}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-[12px] text-[var(--text-secondary)]">{group.description || localizeCustomerGroupName(group, t)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)]">
                      <span>{t("clientsPage.groups.pricingProfile", { defaultValue: "Pricing" })}: {group.pricing_profile || "—"}</span>
                      <span>{t("clientsPage.groups.discountPolicy", { defaultValue: "Discount rule" })}: {group.discount_policy_ref || "—"}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-[8px] border-[var(--border-default)] px-3 text-[12px]"
                      onClick={() => setDraft({
                        id: group.id,
                        name: group.name || "",
                        code: group.code || "",
                        color: group.color || "#4F8CFF",
                        description: group.description || "",
                        pricing_profile: group.pricing_profile || "",
                        discount_policy_ref: group.discount_policy_ref || "",
                        priority: String(group.priority ?? 100),
                      })}
                    >
                      {t("clientsPage.groups.edit", { defaultValue: "Edit" })}
                    </Button>
                    {!group.is_system && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-[8px] border-[var(--border-default)] px-3 text-[12px] text-[#F87171]"
                        onClick={() => handleDelete(group)}
                        disabled={submitting}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        {t("clientsPage.groups.delete", { defaultValue: "Delete" })}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-[18px] font-medium">
              {draft.id
                ? t("clientsPage.groups.editTitle", { defaultValue: "Edit customer group" })
                : t("clientsPage.groups.createTitle", { defaultValue: "Create customer group" })}
            </h3>
            <div className="mt-5 grid grid-cols-1 gap-4">
              <Input placeholder={t("clientsPage.groups.fields.name", { defaultValue: "Group name" })} value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
              <Input placeholder={t("clientsPage.groups.fields.code", { defaultValue: "Internal code" })} value={draft.code} onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input placeholder={t("clientsPage.groups.fields.pricing", { defaultValue: "Pricing profile" })} value={draft.pricing_profile} onChange={(event) => setDraft((prev) => ({ ...prev, pricing_profile: event.target.value }))} />
                <Input placeholder={t("clientsPage.groups.fields.discount", { defaultValue: "Discount policy ref" })} value={draft.discount_policy_ref} onChange={(event) => setDraft((prev) => ({ ...prev, discount_policy_ref: event.target.value }))} />
              </div>
              <div className="grid grid-cols-[1fr_130px] gap-4">
                <Input placeholder={t("clientsPage.groups.fields.color", { defaultValue: "Badge color" })} value={draft.color} onChange={(event) => setDraft((prev) => ({ ...prev, color: event.target.value }))} />
                <Input placeholder={t("clientsPage.groups.fields.priority", { defaultValue: "Priority" })} value={draft.priority} onChange={(event) => setDraft((prev) => ({ ...prev, priority: event.target.value }))} />
              </div>
              <Textarea rows={5} placeholder={t("clientsPage.groups.fields.description", { defaultValue: "Description and business purpose" })} value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetDraft}>
                {t("clientsPage.groups.reset", { defaultValue: "Reset" })}
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {draft.id
                  ? t("clientsPage.groups.save", { defaultValue: "Save group" })
                  : t("clientsPage.groups.create", { defaultValue: "Create group" })}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const formatCompactMoney = (value) => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount)
}

export default function ClientGroupsPage() {
  const { t } = useTranslation("common")
  const [groups, setGroups] = useState([])
  const [analytics, setAnalytics] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState("all")

  const loadPage = async () => {
    setLoading(true)
    try {
      const [groupsResponse, analyticsResponse] = await Promise.all([
        getCustomerGroups({ limit: 200 }),
        getCustomerGroupAnalytics(),
      ])

      const groupItems = groupsResponse?.data || groupsResponse?.customer_groups || []
      const analyticsItems = analyticsResponse?.data || analyticsResponse?.analytics || []

      setGroups(Array.isArray(groupItems) ? groupItems : [])
      setAnalytics(Array.isArray(analyticsItems) ? analyticsItems : [])
    } catch (error) {
      console.error("Failed to load customer groups:", error)
      toastError({
        title: t("clientsPage.groups.loadErrorTitle", { defaultValue: "Failed to load customer groups" }),
        description: error?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage()
  }, [t])

  const visibleAnalytics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return analytics.filter((item) => {
      const matchesQuery = !query || [item.group?.name, item.group?.code, item.group?.pricing_profile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)

      const matchesGroup = groupFilter === "all" || item.group?.id === groupFilter
      return matchesQuery && matchesGroup
    })
  }, [analytics, groupFilter, searchQuery])

  const summary = useMemo(() => {
    const totalClients = analytics.reduce((sum, item) => sum + Number(item.client_count || 0), 0)
    const totalGroups = groups.length
    const topGroup = [...analytics].sort((a, b) => (b.client_count || 0) - (a.client_count || 0))[0]
    const revenueLeader = [...analytics].sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0))[0]
    return { totalClients, totalGroups, topGroup, revenueLeader }
  }, [analytics, groups.length])

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BackLinkButton href="/dashboard/clients" />
          <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {t("clientsPage.groups.pageTitle", { defaultValue: "Customer groups" })}
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link href="/dashboard/clients">
            <Button variant="outline" className="h-[36px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
              {t("clientsPage.groups.backToClients", { defaultValue: "Clients" })}
            </Button>
          </Link>
          <GroupManagementDialog groups={groups} onSaved={loadPage} onDeleted={loadPage} />
        </div>
      </div>

      <p className="mb-6 text-[14px] text-[var(--text-secondary)]">
        {t("clientsPage.subtitle", { defaultValue: "Segment clients for analytics today and pricing or discount automation later." })}
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><Users className="h-4 w-4" />{t("clientsPage.analytics.totalClients", { defaultValue: "Clients in view" })}</div>
          <div className="mt-3 text-[36px] leading-none text-[var(--text-primary)]">{summary.totalClients}</div>
        </div>
        <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><Building2 className="h-4 w-4" />{t("clientsPage.analytics.totalGroups", { defaultValue: "Customer groups" })}</div>
          <div className="mt-3 text-[36px] leading-none text-[var(--text-primary)]">{summary.totalGroups}</div>
        </div>
        <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><Star className="h-4 w-4" />{t("clientsPage.analytics.largestSegment", { defaultValue: "Largest segment" })}</div>
          <div className="mt-3 text-[22px] text-[var(--text-primary)]">{summary.topGroup?.group ? localizeCustomerGroupName(summary.topGroup.group, t) : "—"}</div>
          <div className="mt-1 text-[13px] text-[var(--text-secondary)]">{summary.topGroup?.client_count || 0} {t("clientsPage.analytics.clientsLabel", { defaultValue: "clients" })}</div>
        </div>
        <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><Star className="h-4 w-4" />{t("clientsPage.analytics.revenueLeader", { defaultValue: "Revenue leader" })}</div>
          <div className="mt-3 text-[22px] text-[var(--text-primary)]">{summary.revenueLeader?.group ? localizeCustomerGroupName(summary.revenueLeader.group, t) : "—"}</div>
          <div className="mt-1 text-[13px] text-[var(--text-secondary)]">{formatCompactMoney(summary.revenueLeader?.total_amount || 0)} {t("products.currency", { defaultValue: "сум" })}</div>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[22px] text-[var(--text-primary)]">{t("clientsPage.analytics.title", { defaultValue: "Customer group analytics" })}</h2>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              {t("clientsPage.analytics.description", { defaultValue: "Track client concentration, order volume and revenue by segment." })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                placeholder={t("table.searchPlaceholder", { defaultValue: "Search..." })}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-[36px] w-[220px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface)] pl-9 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-[36px] w-[220px] rounded-[8px] bg-[var(--surface)] text-[12px]">
                <SelectValue placeholder={t("clientsPage.filters.groupPlaceholder", { defaultValue: "Filter by group" })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("clientsPage.filters.allGroups", { defaultValue: "All groups" })}</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>{localizeCustomerGroupName(group, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[var(--text-secondary)]">{t("common.loading", { defaultValue: "Loading..." })}</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleAnalytics.map((item) => (
              <div key={item.group?.id || item.group?.code} className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge
                    variant="outline"
                    className="rounded-full px-2.5 py-1 text-[11px] text-[var(--text-primary)]"
                    style={item.group?.color ? { borderColor: `${item.group.color}66`, backgroundColor: `${item.group.color}12` } : undefined}
                  >
                    {item.group ? localizeCustomerGroupName(item.group, t) : "—"}
                  </Badge>
                  <span className="text-[12px] text-[var(--text-secondary)]">{item.client_count || 0} {t("clientsPage.analytics.clientsLabel", { defaultValue: "clients" })}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-[12px]">
                  <div>
                    <div className="text-[var(--text-muted)]">{t("clientsPage.analytics.orders", { defaultValue: "Orders" })}</div>
                    <div className="mt-1 text-[18px] text-[var(--text-primary)]">{item.order_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">{t("clientsPage.analytics.revenue", { defaultValue: "Revenue" })}</div>
                    <div className="mt-1 text-[18px] text-[var(--text-primary)]">{formatCompactMoney(item.total_amount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">{t("clientsPage.analytics.avg", { defaultValue: "Avg/client" })}</div>
                    <div className="mt-1 text-[18px] text-[var(--text-primary)]">{formatCompactMoney(item.average_revenue || 0)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
