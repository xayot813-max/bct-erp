"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toastError, toastSuccess } from "@/lib/toast"
import { Edit, Trash2 } from "lucide-react"

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import BackLinkButton from "@/components/shared/BackLinkButton"
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
import { createClient, updateClient, deleteClient, createCompany, getCompanies, getCustomerGroups } from "@/lib/actions"
import { useDealStore } from "@/store/dealStore"
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/utils"
import { splitFullName } from "@/lib/utils/text"
import { useTranslation } from "react-i18next"

const ClientSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().optional(),
  phone: z.string().min(9),
  company: z.string().min(1),
  group_id: z.string().min(1),
  company_phone: z.string().optional(),
  address: z.string().optional(),
  comment: z.string().optional(),
})

const localizeCustomerGroupName = (group, t) => {
  const code = typeof group?.code === "string" ? group.code.trim().toLowerCase() : ""
  if (!code) return group?.name || ""
  const translated = t(`clientsPage.groups.names.${code}`, { defaultValue: group?.name || code })
  return translated || group?.name || code
}

const isRegularCustomerGroup = (group) =>
  String(group?.code || "").trim().toLowerCase() === "regular"

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseDateValue = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatDateValue = (value, locale) => {
  const parsed = parseDateValue(value)
  return parsed ? parsed.toLocaleDateString(locale) : "—"
}

const resolveWarrantyEnd = (purchaseDate, guarantee, locale) => {
  const guaranteeText = String(guarantee || "").trim()
  if (!guaranteeText) return "—"

  const directDate = parseDateValue(guaranteeText)
  if (directDate) return directDate.toLocaleDateString(locale)

  const baseDate = parseDateValue(purchaseDate)
  const duration = guaranteeText.match(/(\d+(?:[.,]\d+)?)\s*(лет|год|года|year|years|месяц|месяца|месяцев|month|months|день|дня|дней|day|days)/i)
  if (!baseDate || !duration) return guaranteeText

  const amount = Number(duration[1].replace(",", "."))
  if (!Number.isFinite(amount)) return guaranteeText

  const unit = duration[2].toLowerCase()
  const nextDate = new Date(baseDate)
  if (["лет", "год", "года", "year", "years"].includes(unit)) {
    nextDate.setFullYear(nextDate.getFullYear() + amount)
  } else if (["месяц", "месяца", "месяцев", "month", "months"].includes(unit)) {
    nextDate.setMonth(nextDate.getMonth() + amount)
  } else {
    nextDate.setDate(nextDate.getDate() + amount)
  }

  return nextDate.toLocaleDateString(locale)
}

const normalizePurchaseHistory = (history = []) => {
  if (!Array.isArray(history)) return []

  return history.flatMap((entry, entryIndex) => {
    const products = Array.isArray(entry?.products) ? entry.products : []
    if (products.length === 0) {
      return [{
        key: `${entry?.id || entryIndex}-summary`,
        name: entry?.order_number || "—",
        serial: "—",
        purchaseDate: entry?.created_at,
        warranty: "",
        amount: toNumber(entry?.price),
      }]
    }

    return products.map((product, productIndex) => {
      const quantity = Math.max(1, toNumber(product?.quantity) || 1)
      const productAmount = toNumber(product?.price) * quantity
      return {
        key: `${entry?.id || entryIndex}-${product?.id || productIndex}`,
        name: product?.name || entry?.order_number || "—",
        serial: product?.serial_number || product?.shtrix_number || "—",
        purchaseDate: product?.created_at || entry?.created_at,
        warranty: product?.guarantee || "",
        amount: productAmount || toNumber(entry?.price),
      }
    })
  })
}

export default function ClientForm({ type, data = null, clientId = null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, i18n } = useTranslation("common")
  const loadReferenceData = useDealStore((state) => state.loadReferenceData)
  const [isLoading, setIsLoading] = useState(false)
  const [groups, setGroups] = useState([])

  const isReadonly = type === "show"
  const isEdit = type === "edit"
  const isAdd = type === "add"
  const returnTo = searchParams.get("returnTo")
  const backHref = returnTo?.startsWith("/dashboard") ? returnTo : "/dashboard/clients"

  const defaultValues = useMemo(() => {
    const fallbackSource =
      (typeof data?.name === "string" && data.name) ||
      (typeof data?.full_name === "string" && data.full_name) ||
      (typeof data?.fullName === "string" && data.fullName) ||
      ""
    const derived = splitFullName(fallbackSource)

    return {
      first_name:
        data?.first_name ||
        data?.firstname ||
        data?.firstName ||
        derived.first,
      last_name:
        data?.last_name ||
        data?.lastname ||
        data?.lastName ||
        derived.last,
      email: data?.email || "",
      phone: data?.phone || "",
      company: data?.company || "",
      group_id: data?.group?.id || data?.group_id || "",
      company_phone: data?.company_phone || data?.phone_company || "",
      address: data?.address || "",
      comment: data?.comment || "",
    }
  }, [data])

  const locale = useMemo(() => {
    const language = (i18n.resolvedLanguage || i18n.language || "ru").toLowerCase()
    if (language.startsWith("en")) return "en-US"
    if (language.startsWith("uz")) return "uz-UZ"
    return "ru-RU"
  }, [i18n.language, i18n.resolvedLanguage])

  const historyRows = useMemo(
    () => normalizePurchaseHistory(data?.order_history || data?.orderHistory),
    [data],
  )

  const historySummary = useMemo(() => {
    const totalSpent = historyRows.reduce((sum, row) => sum + row.amount, 0)
    const orderCount = Number(data?.order_count || historyRows.length || 0)
    const lastPurchaseDate = historyRows.reduce((latest, row) => {
      if (!row.purchaseDate) return latest
      const nextTime = new Date(row.purchaseDate).getTime()
      if (Number.isNaN(nextTime)) return latest
      if (!latest) return row.purchaseDate
      return nextTime > new Date(latest).getTime() ? row.purchaseDate : latest
    }, "")

    return { totalSpent, orderCount, lastPurchaseDate }
  }, [data?.order_count, historyRows])

  const form = useForm({
    resolver: zodResolver(
      ClientSchema.superRefine((values, ctx) => {
        if (!values.first_name || values.first_name.trim().length < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["first_name"], message: t("clientForm.fields.firstName") + " " + t("clientForm.fields.required") })
        }
        if (!values.last_name || values.last_name.trim().length < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["last_name"], message: t("clientForm.fields.lastName") + " " + t("clientForm.fields.required") })
        }
        if (values.email && !/\S+@\S+\.\S+/.test(values.email)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: t("clientForm.fields.emailInvalid") })
        }
        if (!values.phone || normalizePhoneNumber(values.phone).replace(/\D/g, "").length < 7) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: t("clientForm.fields.phonePersonal") })
        }
        if (!values.company || values.company.trim().length < 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["company"], message: t("clientForm.fields.company") + " " + t("clientForm.fields.required") })
        }
        if (!values.group_id || values.group_id.trim().length < 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["group_id"], message: t("clientForm.fields.group", { defaultValue: "Customer group" }) + " " + t("clientForm.fields.required") })
        }
      }),
    ),
    defaultValues,
    mode: "onSubmit",
  })

  const pageTitle = isAdd ? t("clientForm.titles.add") : isEdit ? t("clientForm.titles.edit") : t("clientForm.titles.show")

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await getCustomerGroups({ limit: 200 })
        const items = response?.data || response?.customer_groups || []
        const list = Array.isArray(items) ? items : []
        setGroups(list)

        const currentValue = form.getValues("group_id")
        if (!currentValue) {
          const regular = list.find(isRegularCustomerGroup) || list[0]
          if (regular?.id) {
            form.setValue("group_id", regular.id, { shouldValidate: false, shouldDirty: false })
          }
        }
      } catch (error) {
        console.error("Failed to load customer groups:", error)
      }
    }

    loadGroups()
  }, [form])

  const handleSubmit = async (values) => {
    if (isReadonly) return

    setIsLoading(true)
    try {
        const payload = {
        ...values,
        email: values.email?.trim() || "",
        phone: normalizePhoneNumber(values.phone),
        company_phone: normalizePhoneNumber(values.company_phone),
        group_id: values.group_id,
        comment: values.comment?.trim() ? values.comment.trim() : undefined,
      }

      if (isEdit && clientId) {
        await updateClient(clientId, payload)
        toastSuccess({ title: t("clientForm.messages.updated") })
      } else {
        await createClient(payload)
        const companyName = values.company?.trim()
        if (companyName) {
          const response = await getCompanies({ limit: 200 })
          const companies = response?.data || response?.companies || response?.items || []
          const exists = Array.isArray(companies) && companies.some(
            (company) => String(company?.name || "").trim().toLowerCase() === companyName.toLowerCase(),
          )
          if (!exists) {
            await createCompany({
              name: companyName,
              email: values.email?.trim() || "",
              phone: normalizePhoneNumber(values.company_phone || values.phone),
              inn: "",
              address: values.address?.trim() || "",
              comment: values.comment?.trim() || undefined,
            })
          }
        }
        toastSuccess({ title: t("clientForm.messages.created") })
      }

      await loadReferenceData(true)
      router.push(backHref)
    } catch (error) {
      console.error("Client save error:", error)
      toastError({
        title: t("clientForm.messages.saveError"),
        description: error?.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!clientId) return
    setIsLoading(true)
    try {
      await deleteClient(clientId)
      toastSuccess({ title: t("clientForm.messages.deleted") })
      await loadReferenceData(true)
      router.push(backHref)
    } catch (error) {
      console.error("Client delete error:", error)
      toastError({
        title: t("clientForm.messages.deleteError"),
        description: error?.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="figma-form mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackLinkButton href={backHref} />
          <div>
            <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
              {isAdd ? t("clientForm.titles.add") : defaultValues.first_name || pageTitle}
            </h1>
            <p className="mt-3 text-[11px] text-[#8B91A0]">{t("clientForm.breadcrumb")}</p>
          </div>
        </div>

        {isReadonly && clientId && (
          <div className="flex gap-2">
            <Link href={`/dashboard/clients/${clientId}?type=edit`}>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                {t("clientForm.actions.edit")}
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t("clientForm.actions.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("clientForm.dialog.deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("clientForm.dialog.deleteDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("clientForm.actions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t("clientForm.actions.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Card className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] py-4 shadow-[var(--surface-shadow)]">
        <CardHeader className="sr-only">
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 gap-3">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clientForm.fields.firstName")}<span className="text-red-500">{t("clientForm.fields.required")}</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t("clientForm.placeholders.firstName")} disabled={isReadonly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clientForm.fields.lastName")}<span className="text-red-500">{t("clientForm.fields.required")}</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t("clientForm.placeholders.lastName")} disabled={isReadonly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clientForm.fields.company")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("clientForm.placeholders.company")} disabled={isReadonly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clientForm.fields.group", { defaultValue: "Customer group" })}<span className="text-red-500">{t("clientForm.fields.required")}</span></FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isReadonly}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("clientForm.placeholders.group", { defaultValue: "Select customer group" })} />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {localizeCustomerGroupName(group, t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormLabel>{t("clientForm.fields.phonePersonal")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("clientForm.placeholders.phone")}
                        disabled={isReadonly}
                        {...field}
                        onChange={(event) => field.onChange(formatPhoneNumber(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clientForm.fields.phoneCompany")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("clientForm.placeholders.phone")}
                        disabled={isReadonly}
                        {...field}
                        onChange={(event) => field.onChange(formatPhoneNumber(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clientForm.fields.email")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("clientForm.placeholders.email")} disabled={isReadonly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("clientForm.fields.source")}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={t("clientForm.placeholders.source")} disabled={isReadonly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isReadonly && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/clients")}
                    disabled={isLoading}
                    className="h-[22px] rounded-[3px] border-[#D8DBE2] px-4 text-[8px] font-normal"
                  >
                    {t("clientForm.actions.cancel")}
                  </Button>
                  <Button type="submit" className="h-[22px] rounded-[3px] bg-[var(--surface-elevated)] px-4 text-[8px] font-normal text-[var(--text-primary)] shadow-none ring-1 ring-[var(--border-default)] hover:bg-[var(--surface-hover)]" disabled={isLoading}>
                    {isEdit ? t("clientForm.actions.save") : t("clientForm.actions.create")}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
      {isReadonly && (
        <section className="mt-12">
          <h2 className="mb-3 ml-3 text-[13px] font-normal text-[var(--text-primary)]">{t("clientForm.history.title")}</h2>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-4 py-3 shadow-[var(--surface-shadow)]">
              <div className="text-[11px] text-[var(--text-secondary)]">{t("clientForm.history.summary.totalOrders", { defaultValue: "Всего покупок" })}</div>
              <div className="mt-2 text-[22px] font-semibold text-[var(--text-primary)]">{historySummary.orderCount}</div>
            </div>
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-4 py-3 shadow-[var(--surface-shadow)]">
              <div className="text-[11px] text-[var(--text-secondary)]">{t("clientForm.history.summary.totalSpent", { defaultValue: "Общая сумма" })}</div>
              <div className="mt-2 text-[22px] font-semibold text-[var(--text-primary)]">{new Intl.NumberFormat(locale).format(historySummary.totalSpent)} {t("products.currency")}</div>
            </div>
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-4 py-3 shadow-[var(--surface-shadow)]">
              <div className="text-[11px] text-[var(--text-secondary)]">{t("clientForm.history.summary.lastPurchase", { defaultValue: "Последняя покупка" })}</div>
              <div className="mt-2 text-[16px] font-semibold text-[var(--text-primary)]">
                {historySummary.lastPurchaseDate
                  ? formatDateValue(historySummary.lastPurchaseDate, locale)
                  : t("clientForm.history.empty")}
              </div>
            </div>
          </div>
          {historyRows.length > 0 ? (
          <div className="overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface)] p-2 shadow-[var(--surface-shadow)]">
            <table className="w-full border-separate border-spacing-0 text-[10px] text-[var(--text-primary)]">
              <thead>
                <tr className="h-[28px] text-left text-[var(--text-muted)]">
                  {[t("clientForm.history.headers.index"), t("clientForm.history.headers.name"), t("clientForm.history.headers.serial"), t("clientForm.history.headers.purchaseDate"), t("clientForm.history.headers.warrantyEnds"), t("clientForm.history.headers.amount")].map((head) => (
                    <th key={head} className="border-r border-[var(--border-subtle)] px-3 font-normal last:border-r-0">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row, index) => (
                    <tr key={row.key} className={index % 2 === 0 ? "h-[32px] bg-[var(--surface)]" : "h-[32px] bg-[var(--surface-elevated)]"}>
                      <td className="border-r border-[var(--border-subtle)] px-3">{index + 1}</td>
                      <td className="border-r border-[var(--border-subtle)] px-3">{row.name}</td>
                      <td className="border-r border-[var(--border-subtle)] px-3">{row.serial}</td>
                      <td className="border-r border-[var(--border-subtle)] px-3">{formatDateValue(row.purchaseDate, locale)}</td>
                      <td className="border-r border-[var(--border-subtle)] px-3">{resolveWarrantyEnd(row.purchaseDate, row.warranty, locale)}</td>
                      <td className="px-3">{new Intl.NumberFormat(locale).format(row.amount)} {t("products.currency")}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-4 py-10 text-center text-[13px] text-[var(--text-secondary)] shadow-[var(--surface-shadow)]">
              {t("clientForm.history.empty")}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
