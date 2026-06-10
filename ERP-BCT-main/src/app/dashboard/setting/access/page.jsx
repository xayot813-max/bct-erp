"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Edit3, KeyRound, Plus, Search, ShieldCheck, Trash2, UsersRound } from "lucide-react"

import BackLinkButton from "@/components/shared/BackLinkButton"
import { useAuth } from "@/components/providers/AuthProvider"
import { adminService } from "@/lib/api-services"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { toastError, toastSuccess } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const roleIds = ["admin", "manager", "warehouse", "finance", "viewer"]
const emptyForm = { name: "", role: "manager", password: "", confirmPassword: "" }

const resolveId = (admin) => String(admin?.id || admin?._id || "")
const resolveRole = (admin) => admin?.role || "admin"
const roleLabel = (t, role) => t(`settings.access.roles.${role || "manager"}`, { defaultValue: role || "manager" })

const formatDate = (value) => {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString()
}

export default function AccessSettingsPage() {
  const { t } = useTranslation("common")
  const { user, tokens } = useAuth()
  const [admins, setAdmins] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadAdmins = async () => {
    if (!tokens.accessToken) {
      setAdmins([])
      setError(t("adminProfile.authRequiredDescription"))
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError("")
    try {
      const response = await adminService.list(tokens.accessToken)
      setAdmins(extractArrayFromResponse(response, ["admins"]))
    } catch (loadError) {
      const message = loadError?.message || t("settings.access.loadError")
      setError(message)
      toastError({ title: t("settings.access.loadError"), description: message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [tokens.accessToken])

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const source = admins.filter(Boolean)
    if (!query) return source
    return source.filter((admin) => String(admin?.name || "").toLowerCase().includes(query))
  }, [admins, search])

  const currentAdminId = String(user?.id || user?._id || "")
  const activeAdmins = admins.length
  const roleCount = useMemo(() => new Set(admins.map((admin) => resolveRole(admin))).size, [admins])
  const latestUpdate = useMemo(() => {
    return admins
      .map((admin) => new Date(admin?.updated_at || admin?.created_at || 0))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0]
  }, [admins])

  const openCreate = () => {
    setEditingAdmin(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (admin) => {
    setEditingAdmin(admin)
    setForm({ name: admin?.name || "", role: resolveRole(admin), password: "", confirmPassword: "" })
    setDialogOpen(true)
  }

  const validateForm = () => {
    const name = form.name.trim()
    if (name.length < 3) {
      toastError({ title: t("settings.access.validationTitle"), description: t("adminProfile.errors.name") })
      return false
    }
    if (!editingAdmin && form.password.length < 6) {
      toastError({ title: t("settings.access.validationTitle"), description: t("adminProfile.errors.password") })
      return false
    }
    if (form.password && form.password.length < 6) {
      toastError({ title: t("settings.access.validationTitle"), description: t("adminProfile.errors.password") })
      return false
    }
    if (form.password !== form.confirmPassword) {
      toastError({ title: t("settings.access.validationTitle"), description: t("adminProfile.errors.passwordMatch") })
      return false
    }
    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      }
      if (editingAdmin) {
        await adminService.updateById(resolveId(editingAdmin), payload, tokens.accessToken)
        toastSuccess({ title: t("settings.access.updated") })
      } else {
        await adminService.create(payload, tokens.accessToken)
        toastSuccess({ title: t("settings.access.created") })
      }
      setDialogOpen(false)
      setForm(emptyForm)
      setEditingAdmin(null)
      await loadAdmins()
    } catch (saveError) {
      toastError({
        title: t("settings.access.saveError"),
        description: saveError?.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsSaving(true)
    try {
      await adminService.deleteById(resolveId(deleteTarget), tokens.accessToken)
      toastSuccess({ title: t("settings.access.deleted") })
      setDeleteTarget(null)
      await loadAdmins()
    } catch (deleteError) {
      toastError({
        title: t("settings.access.deleteError"),
        description: deleteError?.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <BackLinkButton href="/dashboard/setting" />
          <div>
            <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
              {t("settings.access.title")}
            </h1>
            <p className="mt-3 text-[13px] text-[var(--text-secondary)]">
              {t("settings.access.realDataHint")}
            </p>
          </div>
        </div>
        <Button type="button" onClick={openCreate} className="mt-1">
          <Plus className="h-4 w-4" />
          {t("settings.access.addEmployee")}
        </Button>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <MetricCard icon={UsersRound} label={t("settings.access.totalEmployees")} value={String(activeAdmins)} />
        <MetricCard icon={ShieldCheck} label={t("settings.access.roleTypes")} value={String(roleCount)} />
        <MetricCard icon={KeyRound} label={t("settings.access.lastUpdated")} value={latestUpdate ? latestUpdate.toLocaleDateString() : "—"} />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">{t("settings.access.employees")}</h2>
            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{t("settings.access.employeeHint")}</p>
          </div>
          <div className="relative w-full sm:w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("settings.access.search")}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-[var(--text-secondary)]">{t("common.loading", { defaultValue: "Загрузка..." })}</div>
        ) : error ? (
          <div className="p-10 text-center text-[var(--danger)]">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-[var(--text-secondary)]">
            {t("settings.access.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px] text-[var(--text-primary)]">
              <thead className="bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 text-left font-normal">#</th>
                  <th className="px-5 py-4 text-left font-normal">{t("adminProfile.fields.login")}</th>
                  <th className="px-5 py-4 text-left font-normal">{t("settings.access.role")}</th>
                  <th className="px-5 py-4 text-left font-normal">{t("settings.access.createdAt")}</th>
                  <th className="px-5 py-4 text-left font-normal">{t("settings.access.updatedAt")}</th>
                  <th className="px-5 py-4 text-right font-normal">{t("settings.access.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((admin, index) => {
                  const adminId = resolveId(admin)
                  const isCurrent = currentAdminId && adminId === currentAdminId
                  const deleteDisabled = isCurrent || admins.length <= 1
                  return (
                    <tr key={adminId || index} className="border-t border-[var(--border-subtle)]">
                      <td className="px-5 py-4">{index + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span>{admin?.name || "—"}</span>
                          {isCurrent && (
                            <span className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                              {t("settings.access.current")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">{roleLabel(t, resolveRole(admin))}</td>
                      <td className="px-5 py-4">{formatDate(admin?.created_at)}</td>
                      <td className="px-5 py-4">{formatDate(admin?.updated_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(admin)}>
                            <Edit3 className="h-3.5 w-3.5" />
                            {t("settings.access.editCurrent")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deleteDisabled}
                            onClick={() => setDeleteTarget(admin)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t("settings.access.delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingAdmin={editingAdmin}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        t={t}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.access.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.access.deleteDescription", { name: deleteTarget?.name || "—" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", { defaultValue: "Отмена" })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving}>
              {t("settings.access.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] p-4 shadow-[var(--surface-shadow)]">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[9px] bg-[var(--surface-elevated)] text-[var(--text-primary)]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[12px] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-[18px] font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function AdminDialog({ open, onOpenChange, editingAdmin, form, setForm, onSubmit, isSaving, t }) {
  const isEdit = Boolean(editingAdmin)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mark="true" className="w-[480px] max-w-[calc(100vw-32px)]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("settings.access.editEmployee") : t("settings.access.addEmployee")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("settings.access.editEmployeeHint") : t("settings.access.addEmployeeHint")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[var(--text-primary)]">{t("adminProfile.fields.login")}</label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t("adminProfile.placeholders.login")}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[var(--text-primary)]">{t("settings.access.role")}</label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}
              disabled={isSaving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleIds.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabel(t, role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[var(--text-primary)]">{t("adminProfile.fields.password")}</label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={isEdit ? t("adminProfile.placeholders.passwordOptional") : t("adminProfile.placeholders.password")}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[var(--text-primary)]">{t("adminProfile.fields.confirmPassword")}</label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                placeholder={t("adminProfile.placeholders.confirmPasswordOptional")}
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              {t("common.cancel", { defaultValue: "Отмена" })}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isEdit ? t("settings.access.saveEmployee") : t("settings.access.createEmployee")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
