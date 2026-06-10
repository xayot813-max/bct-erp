"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"
import { Edit, Trash2 } from "lucide-react"

import MultilingualInput from "@/components/shared/MultilingualInput"
import AddImages from "@/components/shared/AddImages"
import BackLinkButton from "@/components/shared/BackLinkButton"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions"
import { parseMultilingual, stringifyMultilingual, hasMultilingualContent } from "@/lib/multilingual"
import { buildImageUrls } from "@/lib/utils/api-helpers"
import { useTranslation } from "react-i18next"

const createCategoryValidation = (t) =>
  z.object({
    title: z
      .string({ required_error: t("categoryForm.fields.title") + " " + t("clientForm.fields.required") })
      .refine((value) => hasMultilingualContent(parseMultilingual(value)), t("categoryForm.messages.titleRequired")),
    description: z.string().max(2000, t("categoryForm.messages.descriptionTooLong")).optional().or(z.literal("")),
  })

export default function CategoryForm({ type, data = null, categoryId = null }) {
  const router = useRouter()
  const { t } = useTranslation("common")
  const [isLoading, setIsLoading] = useState(false)

  const isReadonly = type === "show"
  const isEdit = type === "edit"
  const isAdd = type === "add"
  const CategoryValidation = useMemo(() => createCategoryValidation(t), [t])

  const [images, setImages] = useState(() => {
    const source = data?.images || data?.imageUrl || data?.image || data?.preview
    return source ? buildImageUrls(source) : []
  })

  const defaultValues = useMemo(
    () => ({
      title: data?.title || data?.name || "",
      description: data?.description || "",
    }),
    [data],
  )

  const form = useForm({
    resolver: zodResolver(CategoryValidation),
    defaultValues,
    mode: "onSubmit",
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  useEffect(() => {
    const source = data?.images || data?.imageUrl || data?.image || data?.preview
    setImages(source ? buildImageUrls(source) : [])
  }, [data])

  const onSubmit = async (values) => {
    if (isReadonly) return

    setIsLoading(true)
    try {
      const titleMultilingual = parseMultilingual(values.title)
      const descriptionMultilingual = parseMultilingual(values.description)

      const primaryImage = images[0]?.path || images[0]?.url || undefined

      if (!primaryImage) {
        toastWarning({ title: t("categoryForm.messages.imageRequired") })
        setIsLoading(false)
        return
      }

      const payload = {
        title: stringifyMultilingual(titleMultilingual),
        name: stringifyMultilingual(titleMultilingual),
        description: hasMultilingualContent(descriptionMultilingual)
          ? stringifyMultilingual(descriptionMultilingual)
          : "",
        imageUrl: primaryImage,
        image: primaryImage,
      }

      if (isEdit && categoryId) {
        await updateCategory(categoryId, payload)
        toastSuccess({ title: t("categoryForm.messages.updated") })
      } else {
        await createCategory(payload)
        toastSuccess({ title: t("categoryForm.messages.created") })
      }

      router.push("/dashboard/products/categories")
    } catch (error) {
      console.error("Error saving category:", error)
      toastError({
        title: t("categoryForm.messages.saveError"),
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryId) return

    setIsLoading(true)
    try {
      await deleteCategory(categoryId)
      toastSuccess({ title: t("categoryForm.messages.deleted") })
      router.push("/dashboard/products/categories")
    } catch (error) {
      console.error("Error deleting category:", error)
      toastError({
        title: t("categoryForm.messages.deleteError"),
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="figma-form mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackLinkButton href="/dashboard/products/categories" />
          <div>
            <h1 className="text-[24px] font-normal leading-none text-[#252833]">
              {isAdd && t("categoryForm.titles.add")}
              {isEdit && t("categoryForm.titles.edit")}
              {isReadonly && t("categoryForm.titles.show")}
            </h1>
            <p className="mt-3 text-[7px] text-[#8B91A0]">{t("categoryForm.breadcrumb")}</p>
          </div>
        </div>

        {isReadonly && categoryId && (
          <div className="flex gap-2">
            <Link href={`/dashboard/products/categories/${categoryId}?type=edit`}>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                {t("categoryForm.actions.edit")}
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t("categoryForm.actions.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("categoryForm.dialog.deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("categoryForm.dialog.deleteDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("categoryForm.actions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t("categoryForm.actions.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_180px]">
          <Card className="rounded-[4px] border-0 bg-white py-4 shadow-none">
            <CardHeader className="sr-only">
              <CardTitle>{t("categoryForm.mainInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[7px] font-normal text-[#252833]">{t("categoryForm.fields.title")}<span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <MultilingualInput
                        value={parseMultilingual(field.value)}
                        onChange={(updated) => field.onChange(stringifyMultilingual(updated))}
                        placeholder={t("categoryForm.placeholders.title")}
                        disabled={isReadonly || isLoading}
                        className="h-[23px] rounded-[3px] border border-[#C8CBD2] px-2 text-[8px] text-[#252833]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[7px] font-normal text-[#252833]">{t("categoryForm.fields.description")}<span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <MultilingualInput
                        type="textarea"
                        value={parseMultilingual(field.value)}
                        onChange={(updated) => field.onChange(stringifyMultilingual(updated))}
                        placeholder={t("categoryForm.placeholders.description")}
                        disabled={isReadonly || isLoading}
                        className="min-h-[95px] rounded-[3px] border border-[#C8CBD2] px-2 py-2 text-[8px] text-[#252833]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          <div className="space-y-3">
            <AddImages
              images={images}
              setImages={setImages}
              maxImages={1}
              title={t("categoryForm.images.title")}
              allowMultiple={false}
              infoText={t("categoryForm.images.info")}
              sticky={!isReadonly}
              disabled={isReadonly || isLoading}
            />

            {(data?.createdAt || data?.created_at || data?.updatedAt || data?.updated_at) && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("categoryForm.meta.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {(data?.createdAt || data?.created_at) && (
                    <p>{t("categoryForm.meta.createdAt")}: {new Date(data.createdAt || data.created_at).toLocaleString()}</p>
                  )}
                  {(data?.updatedAt || data?.updated_at) && (
                    <p>{t("categoryForm.meta.updatedAt")}: {new Date(data.updatedAt || data.updated_at).toLocaleString()}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {!isReadonly && (
              <div className="flex justify-end gap-2">
                <Button type="submit" className="h-[22px] rounded-[3px] bg-white px-4 text-[8px] font-normal text-[#252833] shadow-none ring-1 ring-[#D8DBE2] hover:bg-[#F5F6F8]" disabled={isLoading}>
                  {t("categoryForm.actions.create")}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard/products/categories")} className="h-[22px] rounded-[3px] border-[#D8DBE2] px-4 text-[8px] font-normal">
                  {t("categoryForm.actions.cancel")}
                </Button>
              </div>
            )}

            {isEdit && categoryId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full gap-2" disabled={isLoading}>
                    <Trash2 className="h-4 w-4" />
                    {t("categoryForm.actions.deleteCategory")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("categoryForm.dialog.deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("categoryForm.dialog.deleteDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("categoryForm.actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>{t("categoryForm.actions.delete")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
