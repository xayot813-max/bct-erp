"use client"

import { useMemo, useState } from "react"
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
import { createCompany, updateCompany, deleteCompany } from "@/lib/actions"
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/utils"
import { useDealStore } from "@/store/dealStore"
import { useTranslation } from "react-i18next"

const createCompanySchema = (t) =>
  z.object({
    name: z.string().min(2, `${t("companyForm.fields.name")} ${t("clientForm.fields.required")}`),
    email: z.string().trim().optional().refine((value) => !value || /\S+@\S+\.\S+/.test(value), t("clientForm.fields.emailInvalid")),
    inn: z.string().min(5, `${t("companyForm.fields.inn")} ${t("clientForm.fields.required")}`),
    phone: z.string().min(7, t("clientForm.fields.phoneInvalid")),
    address: z.string().optional(),
    comment: z.string().optional(),
  })

export default function CompanyForm({ type, data = null, companyId = null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation("common")
  const loadReferenceData = useDealStore((state) => state.loadReferenceData)
  const [isLoading, setIsLoading] = useState(false)
  const companySchema = useMemo(() => createCompanySchema(t), [t])

  const isReadonly = type === "show"
  const isEdit = type === "edit"
  const isAdd = type === "add"
  const returnTo = searchParams.get("returnTo")
  const backHref = returnTo?.startsWith("/dashboard") ? returnTo : "/dashboard/companies"

  const defaultValues = useMemo(
    () => ({
      name: data?.name || "",
      email: data?.email || "",
      inn: data?.inn || data?.ctir || "",
      phone: data?.phone || "",
      address: data?.address || "",
      comment: data?.comment || "",
    }),
    [data],
  )

  const form = useForm({
    resolver: zodResolver(companySchema),
    defaultValues,
    mode: "onSubmit",
  })

  const handleSubmit = async (values) => {
    if (isReadonly) return
    setIsLoading(true)
    try {
      const payload = {
        ...values,
        email: values.email?.trim() || "",
        phone: normalizePhoneNumber(values.phone),
        address: values.address?.trim() || "",
        comment: values.comment?.trim() || "",
      }

      if (isEdit && companyId) {
        await updateCompany(companyId, payload)
        toastSuccess({ title: t("companyForm.messages.updated") })
      } else {
        await createCompany(payload)
        toastSuccess({ title: t("companyForm.messages.created") })
      }
      await loadReferenceData(true)
      router.push(backHref)
    } catch (error) {
      console.error("Company save error:", error)
      toastError({
        title: t("companyForm.messages.saveError"),
        description: error?.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!companyId) return
    setIsLoading(true)
    try {
      await deleteCompany(companyId)
      toastSuccess({ title: t("companyForm.messages.deleted") })
      await loadReferenceData(true)
      router.push(backHref)
    } catch (error) {
      console.error("Company delete error:", error)
      toastError({
        title: t("companyForm.messages.deleteError"),
        description: error?.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const pageTitle = isAdd ? t("companyForm.titles.add") : isEdit ? t("companyForm.titles.edit") : t("companyForm.titles.show")

  return (
    <div className="figma-form mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackLinkButton href={backHref} />
          <div>
            <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[#252833]">{pageTitle}</h1>
            <p className="mt-3 text-[12px] text-[#8B91A0]">{t("companyForm.breadcrumb")}</p>
          </div>
        </div>

        {isReadonly && companyId && (
          <div className="flex gap-2">
            <Link href={`/dashboard/companies/${companyId}?type=edit`}>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" /> {t("companyForm.actions.edit")}
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" /> {t("companyForm.actions.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("companyForm.dialog.deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("companyForm.dialog.deleteDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("companyForm.actions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t("companyForm.actions.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Card className="rounded-[4px] border-0 bg-white py-4 shadow-none">
        <CardHeader className="sr-only">
          <CardTitle>{t("companyForm.fields.name")}</CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("companyForm.fields.name")}<span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t("companyForm.placeholders.name")} disabled={isReadonly} {...field} />
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
                    <FormLabel>{t("companyForm.fields.email")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("companyForm.placeholders.email")} disabled={isReadonly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("companyForm.fields.inn")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("companyForm.placeholders.inn")} disabled={isReadonly} {...field} />
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
                    <FormLabel>{t("companyForm.fields.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("companyForm.placeholders.phone")}
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("companyForm.fields.address")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("companyForm.placeholders.address")} disabled={isReadonly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("companyForm.fields.comment")}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={t("companyForm.placeholders.comment")} disabled={isReadonly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {data && !isAdd && (
                <div className="grid grid-cols-1 gap-3 rounded-[8px] border border-dashed border-[#D8DBE2] p-4 text-[12px] leading-5 text-[#8B91A0] sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-gray-900">{t("companyForm.meta.orders")}</span> {data.order_count ?? 0}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{t("companyForm.meta.totalAmount")}</span> {(data.total_amount ?? 0).toLocaleString()} {t("products.currency")}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{t("companyForm.meta.createdAt")}</span> {data.created_at ? new Date(data.created_at).toLocaleString() : "—"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{t("companyForm.meta.updatedAt")}</span> {data.updated_at ? new Date(data.updated_at).toLocaleString() : "—"}
                  </div>
                </div>
              )}

              {!isReadonly && (
                <div className="flex justify-end gap-2 pt-12">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/companies")}
                    disabled={isLoading}
                    className="h-9 rounded-[8px] border-[#D8DBE2] px-4 text-[13px] font-normal"
                  >
                    {t("companyForm.actions.cancel")}
                  </Button>
                  <Button type="submit" className="h-9 rounded-[8px] bg-white px-4 text-[13px] font-normal text-[#252833] shadow-none ring-1 ring-[#D8DBE2] hover:bg-[#F5F6F8]" disabled={isLoading}>
                    {isEdit ? t("common.save", { defaultValue: "Save" }) : t("companyForm.actions.create")}
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
