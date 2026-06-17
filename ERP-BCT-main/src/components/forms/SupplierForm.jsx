"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Edit, Trash2 } from "lucide-react"

import BackLinkButton from "@/components/shared/BackLinkButton"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
import { toastError, toastSuccess } from "@/lib/toast"
import { createVendor, deleteVendor, updateVendor } from "@/lib/actions"
import { formatUzPhone, isCompleteUzPhone, normalizeUzPhone } from "@/lib/utils"
import { useTranslation } from "react-i18next"

const createSupplierSchema = (t) =>
  z.object({
    name: z.string().min(2, t("supplierForm.validation.name")),
    phone: z.string().optional().refine((value) => !value || isCompleteUzPhone(value), {
      message: t("supplierForm.validation.phone"),
    }),
    agent: z.string().optional(),
    default_mode: z.string().min(1, t("supplierForm.validation.defaultMode")),
    allow_cash: z.boolean().default(false),
    allow_debt: z.boolean().default(false),
    allow_mixed: z.boolean().default(false),
    active_for_supplies: z.boolean().default(true),
    current_debt: z.string().optional(),
    debt_limit: z.string().optional(),
    comment: z.string().optional(),
  })

const normalizeNumericInput = (value = "") => String(value).replace(/[^\d\s.,-]/g, "")

export default function SupplierForm({ type, data = null, supplierId = null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation("common")
  const [isLoading, setIsLoading] = useState(false)

  const isReadonly = type === "show"
  const isEdit = type === "edit"
  const isAdd = type === "add"
  const returnTo = searchParams.get("returnTo")
  const backHref = returnTo?.startsWith("/dashboard") ? returnTo : "/dashboard/werehouses/suppliers"

  const supplierSchema = useMemo(() => createSupplierSchema(t), [t])
  const defaultValues = useMemo(
    () => ({
      name: data?.name || "",
      phone: data?.phone || "",
      agent: data?.agent || "",
      default_mode: data?.default_mode || data?.defaultMode || "partial",
      allow_cash: Boolean(data?.allow_cash ?? data?.allowCash),
      allow_debt: Boolean(data?.allow_debt ?? data?.allowDebt),
      allow_mixed: Boolean(data?.allow_mixed ?? data?.allowMixed),
      active_for_supplies: data?.active_for_supplies ?? data?.activeForSupplies ?? true,
      current_debt: data?.current_debt !== undefined && data?.current_debt !== null ? String(data.current_debt) : "",
      debt_limit: data?.debt_limit !== undefined && data?.debt_limit !== null ? String(data.debt_limit) : "",
      comment: data?.comment || "",
    }),
    [data],
  )

  const form = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues,
    mode: "onSubmit",
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const handleSubmit = async (values) => {
    if (isReadonly) return

    setIsLoading(true)
    try {
      const payload = {
        name: values.name.trim(),
        phone: normalizeUzPhone(values.phone?.trim() || ""),
        agent: values.agent?.trim() || "",
        default_mode: values.default_mode,
        allow_cash: values.allow_cash,
        allow_debt: values.allow_debt,
        allow_mixed: values.allow_mixed,
        active_for_supplies: values.active_for_supplies,
        current_debt: Number(String(values.current_debt || "0").replace(/\s/g, "").replace(",", ".")) || 0,
        debt_limit: Number(String(values.debt_limit || "0").replace(/\s/g, "").replace(",", ".")) || 0,
        comment: values.comment?.trim() || "",
      }

      if (isEdit && supplierId) {
        await updateVendor(supplierId, payload)
        toastSuccess({ title: t("supplierForm.messages.updated") })
      } else {
        await createVendor(payload)
        toastSuccess({ title: t("supplierForm.messages.created") })
      }

      router.push(backHref)
    } catch (error) {
      console.error("Supplier save error:", error)
      toastError({
        title: t("supplierForm.messages.saveError"),
        description: error?.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!supplierId) return

    setIsLoading(true)
    try {
      await deleteVendor(supplierId)
      toastSuccess({ title: t("supplierForm.messages.deleted") })
      router.push(backHref)
    } catch (error) {
      console.error("Supplier delete error:", error)
      toastError({
        title: t("supplierForm.messages.deleteError"),
        description: error?.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const pageTitle = isAdd ? t("supplierForm.titles.add") : isEdit ? t("supplierForm.titles.edit") : t("supplierForm.titles.show")

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackLinkButton href={backHref} />
          <div>
            <h1 className="text-[40px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">{pageTitle}</h1>
            <p className="mt-3 text-[12px] text-[var(--text-secondary)]">{t("supplierForm.breadcrumb")}</p>
          </div>
        </div>

        {isReadonly && supplierId && (
          <div className="flex gap-2">
            <Link href={`/dashboard/werehouses/suppliers/${supplierId}?type=edit`}>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                {t("supplierForm.actions.edit")}
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t("supplierForm.actions.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("supplierForm.dialog.deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("supplierForm.dialog.deleteDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("supplierForm.actions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t("supplierForm.actions.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Card className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <CardHeader className="sr-only">
          <CardTitle>{pageTitle}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supplierForm.fields.name")}<span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input disabled={isReadonly} placeholder={t("supplierForm.placeholders.name")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supplierForm.fields.phone")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isReadonly}
                          placeholder={t("supplierForm.placeholders.phone")}
                          {...field}
                          onChange={(event) => field.onChange(formatUzPhone(event.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supplierForm.fields.agent")}</FormLabel>
                      <FormControl>
                        <Input disabled={isReadonly} placeholder={t("supplierForm.placeholders.agent")} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="default_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supplierForm.fields.defaultMode")}</FormLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {["partial", "cash", "debt"].map((mode) => {
                          const active = field.value === mode
                          return (
                            <button
                              key={mode}
                              type="button"
                              disabled={isReadonly}
                              onClick={() => field.onChange(mode)}
                              className={`h-12 rounded-[12px] border px-3 text-[14px] font-semibold transition ${
                                active
                                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                                  : "border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                              }`}
                            >
                              {t(`supplierForm.defaultModes.${mode}`)}
                            </button>
                          )
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="current_debt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supplierForm.fields.currentDebt")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isReadonly}
                          inputMode="decimal"
                          placeholder="0"
                          value={field.value}
                          onChange={(event) => field.onChange(normalizeNumericInput(event.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="debt_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supplierForm.fields.debtLimit")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isReadonly}
                          inputMode="decimal"
                          placeholder="0"
                          value={field.value}
                          onChange={(event) => field.onChange(normalizeNumericInput(event.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4">
                {[
                  ["allow_cash", t("supplierForm.fields.allowCash")],
                  ["allow_debt", t("supplierForm.fields.allowDebt")],
                  ["allow_mixed", t("supplierForm.fields.allowMixed")],
                  ["active_for_supplies", t("supplierForm.fields.activeForSupplies")],
                ].map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-4 rounded-[10px] border-b border-[var(--border-subtle)] pb-3 last:border-b-0 last:pb-0">
                        <FormLabel className="m-0 text-[15px] font-semibold text-[var(--text-primary)]">{label}</FormLabel>
                        <FormControl>
                          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={isReadonly} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("supplierForm.fields.comment")}</FormLabel>
                    <FormControl>
                      <Textarea disabled={isReadonly} placeholder={t("supplierForm.placeholders.comment")} rows={4} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isReadonly && (
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => router.push(backHref)} className="h-10 rounded-[10px] px-4" disabled={isLoading}>
                    {t("supplierForm.actions.cancel")}
                  </Button>
                  <Button type="submit" className="h-10 rounded-[10px] px-4" disabled={isLoading}>
                    {isEdit ? t("common.save", { defaultValue: "Save" }) : t("supplierForm.actions.create")}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
