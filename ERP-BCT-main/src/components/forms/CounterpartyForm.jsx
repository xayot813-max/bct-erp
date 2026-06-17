"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toastError, toastSuccess } from "@/lib/toast"
import { Edit, Save, Trash2 } from "lucide-react"

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
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
import { createCounterparty, updateCounterparty, deleteCounterparty } from "@/lib/actions"
import { useDealStore } from "@/store/dealStore"
import { splitFullName } from "@/lib/utils/text"
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/utils"
import { useTranslation } from "react-i18next"

const createCounterpartySchema = (t) =>
  z.object({
    name: z.string().min(2, t("counterpartyForm.fields.name") + " " + t("clientForm.fields.required")),
    position: z.string().min(2, t("counterpartyForm.fields.position") + " " + t("clientForm.fields.required")),
    email: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /\S+@\S+\.\S+/.test(value), t("counterpartyForm.fields.email") + " " + t("clientForm.fields.invalid")),
    phone: z.string().trim().min(7, t("counterpartyForm.fields.phone") + " " + t("clientForm.fields.invalid")),
    company: z.string().min(1, t("counterpartyForm.fields.company") + " " + t("clientForm.fields.required")),
    company_phone: z.string().optional(),
    address: z.string().optional(),
    comment: z.string().optional(),
  })

export default function CounterpartyForm({ type, data = null, counterpartyId = null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation("common")
  const loadReferenceData = useDealStore((state) => state.loadReferenceData)
  const [isLoading, setIsLoading] = useState(false)

  const isReadonly = type === "show"
  const isEdit = type === "edit"
  const isAdd = type === "add"
  const returnTo = searchParams.get("returnTo")
  const backHref = returnTo?.startsWith("/dashboard") ? returnTo : "/dashboard/counterparties"
  const CounterpartySchema = useMemo(() => createCounterpartySchema(t), [t])

  const defaultValues = useMemo(() => {
    const fallbackSource =
      (typeof data?.name === "string" && data.name) ||
      (typeof data?.full_name === "string" && data.full_name) ||
      (typeof data?.fullName === "string" && data.fullName) ||
      ""
    const derived = splitFullName(fallbackSource)

    return {
      name:
        data?.name ||
        [data?.first_name || data?.firstname || data?.firstName || derived.first, data?.last_name || data?.lastname || data?.lastName || derived.last]
          .filter(Boolean)
          .join(" ")
          .trim(),
      position:
        data?.position ||
        data?.job_title ||
        data?.role ||
        "",
      email: data?.email || "",
      phone: data?.phone || "",
      company: data?.company || "",
      company_phone: data?.company_phone || data?.phone_company || "",
      address: data?.address || "",
      comment: data?.comment || "",
    }
  }, [data])

  const form = useForm({
    resolver: zodResolver(CounterpartySchema),
    defaultValues,
    mode: "onSubmit",
  })

  const pageTitle = isAdd ? t("counterpartyForm.titles.add") : isEdit ? t("counterpartyForm.titles.edit") : t("counterpartyForm.titles.show")
  const autoCompleteMode = isAdd ? "new-password" : "off"

  const buildPayload = (values) => {
    const derived = splitFullName(values.name)

    return {
      ...values,
      email: values.email?.trim() || "",
      phone: normalizePhoneNumber(values.phone),
      company_phone: normalizePhoneNumber(values.company_phone),
      address: values.address?.trim() || "",
      comment: values.comment?.trim() || "",
      first_name: derived.first || values.name,
      last_name: derived.last || values.position,
      fullname: values.name,
      full_name: values.name,
      position: values.position,
    }
  }

  const handleSubmit = async (values) => {
    if (isReadonly) return
    setIsLoading(true)
    try {
      const payload = buildPayload(values)
      if (isEdit && counterpartyId) {
        await updateCounterparty(counterpartyId, payload)
        toastSuccess({ title: t("counterpartyForm.messages.updated") })
      } else {
        await createCounterparty(payload)
        toastSuccess({ title: t("counterpartyForm.messages.created") })
      }
      await loadReferenceData(true)
      router.push(backHref)
    } catch (error) {
      console.error("Counterparty save error:", error)
      toastError({
        title: t("counterpartyForm.messages.saveError"),
        description: error?.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!counterpartyId) return
    setIsLoading(true)
    try {
      await deleteCounterparty(counterpartyId)
      toastSuccess({ title: t("counterpartyForm.messages.deleted") })
      await loadReferenceData(true)
      router.push(backHref)
    } catch (error) {
      console.error("Counterparty delete error:", error)
      toastError({
        title: t("counterpartyForm.messages.deleteError"),
        description: error?.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackLinkButton href={backHref} />
          <div>
            <h1 className="text-[34px] font-normal leading-tight text-[#252936]">{pageTitle}</h1>
            {counterpartyId && !isAdd && (
              <p className="text-[11px] text-muted-foreground">{t("counterpartyForm.idLabel")}: {counterpartyId}</p>
            )}
          </div>
        </div>

        {isReadonly && counterpartyId && (
          <div className="flex gap-2">
            <Link href={`/dashboard/counterparties/${counterpartyId}?type=edit`}>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                {t("counterpartyForm.actions.edit")}
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t("counterpartyForm.actions.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("counterpartyForm.dialog.deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("counterpartyForm.dialog.deleteDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("counterpartyForm.actions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t("counterpartyForm.actions.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="min-h-[570px] rounded-md bg-white p-5 shadow-[0_1px_12px_rgba(24,28,38,0.03)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3" autoComplete="off">
              {isAdd && (
                <>
                  <input type="text" name="fake-name" autoComplete="name" className="hidden" tabIndex={-1} aria-hidden="true" />
                  <input type="email" name="fake-email" autoComplete="email" className="hidden" tabIndex={-1} aria-hidden="true" />
                  <input type="tel" name="fake-phone" autoComplete="tel" className="hidden" tabIndex={-1} aria-hidden="true" />
                  <input type="password" name="fake-password" autoComplete="new-password" className="hidden" tabIndex={-1} aria-hidden="true" />
                </>
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("counterpartyForm.fields.name")}<span className="text-[#ff3b30]">*</span></FormLabel>
                    <FormControl>
                      <Input className="h-[31px] rounded-[5px] border-[#cfd4dc] bg-white px-2 text-[11px]" placeholder={t("counterpartyForm.placeholders.name")} disabled={isReadonly} autoComplete={autoCompleteMode} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("counterpartyForm.fields.position")}</FormLabel>
                    <FormControl>
                      <Input className="h-[31px] rounded-[5px] border-[#cfd4dc] bg-white px-2 text-[11px]" placeholder={t("counterpartyForm.placeholders.position")} disabled={isReadonly} autoComplete={autoCompleteMode} {...field} />
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
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("counterpartyForm.fields.email")}</FormLabel>
                    <FormControl>
                      <Input className="h-[31px] rounded-[5px] border-[#cfd4dc] bg-white px-2 text-[11px]" placeholder={t("counterpartyForm.placeholders.email")} disabled={isReadonly} autoComplete={isAdd ? "new-password" : "email"} {...field} />
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
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("counterpartyForm.fields.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        className="h-[31px] rounded-[5px] border-[#cfd4dc] bg-white px-2 text-[11px]"
                        placeholder={t("counterpartyForm.placeholders.phone")}
                        disabled={isReadonly}
                        autoComplete={autoCompleteMode}
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
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("counterpartyForm.fields.company")}</FormLabel>
                    <FormControl>
                      <Input className="h-[31px] rounded-[5px] border-[#cfd4dc] bg-white px-2 text-[11px]" placeholder={t("counterpartyForm.placeholders.company")} disabled={isReadonly} autoComplete={autoCompleteMode} {...field} />
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
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("counterpartyForm.fields.companyPhone")}</FormLabel>
                    <FormControl>
                      <Input
                        className="h-[31px] rounded-[5px] border-[#cfd4dc] bg-white px-2 text-[11px]"
                        placeholder={t("counterpartyForm.placeholders.phone")}
                        disabled={isReadonly}
                        autoComplete={autoCompleteMode}
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
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("counterpartyForm.fields.address")}</FormLabel>
                    <FormControl>
                      <Input className="h-[31px] rounded-[5px] border-[#cfd4dc] bg-white px-2 text-[11px]" placeholder={t("counterpartyForm.placeholders.address")} disabled={isReadonly} autoComplete={autoCompleteMode} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("counterpartyForm.fields.comment")}</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[70px] rounded-[5px] border-[#cfd4dc] bg-white px-2 py-2 text-[11px]" placeholder={t("counterpartyForm.placeholders.comment")} disabled={isReadonly} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isReadonly && (
                <div className="flex justify-end gap-2 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/counterparties")}
                    disabled={isLoading}
                    className="h-8 rounded-md px-4 text-[11px]"
                  >
                    {t("counterpartyForm.actions.cancel")}
                  </Button>
                  <Button type="submit" className="h-8 gap-2 rounded-md border border-[#252833] bg-[#252833] px-4 text-[11px] text-white hover:bg-[#303441]" disabled={isLoading}>
                    <Save className="h-4 w-4" />
                    {isEdit ? t("counterpartyForm.actions.save") : t("counterpartyForm.actions.create")}
                  </Button>
                </div>
              )}
            </form>
          </Form>
      </div>
    </div>
  )
}
