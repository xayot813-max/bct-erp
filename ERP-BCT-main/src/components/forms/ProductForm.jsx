"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import CustomFormField, { FormFieldType } from "@/components/shared/customFormField"
import MultilingualInput from "@/components/shared/MultilingualInput"
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AddImages from '@/components/shared/AddImages'
import { Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
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
import { createProduct, updateProduct, deleteProduct, getCategories, getTopCategories } from '@/lib/actions'
import { buildImageUrls, extractArrayFromResponse, toSelectOption, ensureOption, resolveRecordId } from '@/lib/utils/api-helpers'
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"
import { parseMultilingual, stringifyMultilingual, hasMultilingualContent, getLocalizedValue } from "@/lib/multilingual"
import { useTranslation } from "react-i18next"
import { FormLanguageProvider } from "@/components/forms/FormLanguageContext"
import FormLanguageToolbar from "@/components/forms/FormLanguageToolbar"
import ProductDescriptionEditor from "@/components/forms/ProductDescriptionEditor"
import { parseDescriptionState, serializeDescriptionState } from "@/lib/utils/product-description"
import BackLinkButton from "@/components/shared/BackLinkButton"
import { currencyReferenceOptions } from "@/lib/reference-data"

const productInputClass =
  "h-11 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"

const WARRANTY_UNITS = ["days", "months", "years"]

const parseWarrantyParts = (value = "") => {
  const raw = String(value || "").trim()
  if (!raw) return { warranty_value: "", warranty_unit: "months" }

  const parsedMultilingual = parseMultilingual(raw)
  const localizedRaw = parsedMultilingual?.ru || parsedMultilingual?.uz || parsedMultilingual?.en || raw
  const match = String(localizedRaw).trim().match(/^(\d+)\s*(day|days|month|months|year|years|день|дня|дней|месяц|месяца|месяцев|год|года|лет|kun|oy|yil)?$/i)
  if (!match) {
    return { warranty_value: raw, warranty_unit: "months" }
  }

  const unitRaw = String(match[2] || "").toLowerCase()
  let warrantyUnit = "months"
  if (["day", "days", "день", "дня", "дней", "kun"].includes(unitRaw)) warrantyUnit = "days"
  if (["year", "years", "год", "года", "лет", "yil"].includes(unitRaw)) warrantyUnit = "years"

  return {
    warranty_value: match[1] || "",
    warranty_unit: warrantyUnit,
  }
}

const buildWarrantyPayload = (value, unit) => {
  const amount = String(value || "").trim()
  if (!amount) return ""
  return `${amount} ${unit}`
}

const normalizeMoneyInput = (value = "") => {
  const normalized = String(value).replace(/\s/g, "").replace(",", ".")
  const [integer = "", ...fractionParts] = normalized.split(".")
  const digits = integer.replace(/\D/g, "")
  const fraction = fractionParts.join("").replace(/\D/g, "").slice(0, 2)
  return fractionParts.length > 0 ? `${digits}.${fraction}` : digits
}

const formatMoneyInput = (value = "") => {
  const normalized = normalizeMoneyInput(value)
  if (!normalized) return ""
  const [integer, fraction] = normalized.split(".")
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return fraction !== undefined ? `${formattedInteger}.${fraction}` : formattedInteger
}

export default function ProductForm({ type, data = null, productId = null }) {
  const router = useRouter()
  const { i18n, t } = useTranslation("common")
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [topCategories, setTopCategories] = useState([])
  const [loadingTopCategories, setLoadingTopCategories] = useState(true)
  const initialImageSource =
    data?.images ??
    data?.image ??
    data?.imageUrl ??
    data?.photos ??
    data?.files ??
    null
  const [images, setImages] = useState(
    initialImageSource ? buildImageUrls(initialImageSource) : []
  )

  const isReadonly = type === 'show'
  const isEdit = type === 'edit'
  const isAdd = type === 'add'

  useEffect(() => {
    const nextSource =
      data?.images ??
      data?.image ??
      data?.imageUrl ??
      data?.photos ??
      data?.files ??
      null
    setImages(nextSource ? buildImageUrls(nextSource) : [])
  }, [data])

  // Load categories on mount or when product data changes
  useEffect(() => {
    let isMounted = true

    const loadCategories = async () => {
      setLoadingCategories(true)
      try {
        const response = await getCategories({ limit: 100 })
        const raw = extractArrayFromResponse(response, ["categories"])
        const normalized = raw
          .map((item, index) => toSelectOption(item, index, `${t("productForm.fields.category")} ${index + 1}`))
          .filter(Boolean)

        let merged = normalized

        merged = ensureOption(
          merged,
          data?.category,
          data?.category_name ||
            data?.categoryTitle ||
            (typeof data?.category === "string" ? data.category : undefined) ||
            t("productForm.fallbacks.selectedCategory"),
        )

        merged = ensureOption(
          merged,
          data?.category_id || data?.categoryId
            ? {
                id: data?.category_id ?? data?.categoryId,
                name:
                  data?.category_name ||
                  data?.categoryTitle ||
                  data?.category_label ||
                  data?.categoryLabel ||
                  (typeof data?.category === "string" ? data.category : undefined),
              }
            : null,
          data?.category_name ||
            data?.categoryTitle ||
            data?.category_label ||
            data?.categoryLabel ||
            t("productForm.fallbacks.selectedCategory"),
        )

        if (isMounted) {
          setCategories(merged.filter(Boolean))
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        if (isMounted) {
          setCategories([])
        }
        toastError({ title: t("productForm.messages.loadCategoriesError") })
      } finally {
        if (isMounted) {
          setLoadingCategories(false)
        }
      }
    }

    loadCategories()

    return () => {
      isMounted = false
    }
  }, [data, t])

  useEffect(() => {
    let isMounted = true

    const loadTopCategories = async () => {
      setLoadingTopCategories(true)
      try {
        const response = await getTopCategories({ limit: 100 })
        const raw = extractArrayFromResponse(response, ["top_categories"])
        const normalized = raw
          .map((item, index) => toSelectOption(item, index, `${t("productForm.fields.topCategory")} ${index + 1}`))
          .filter(Boolean)

        let merged = normalized

        merged = ensureOption(
          merged,
          data?.top_category,
          data?.top_category_name ||
            data?.topCategoryName ||
            (typeof data?.top_category === "string" ? data.top_category : undefined) ||
            t("productForm.fallbacks.selectedTopCategory"),
        )

        merged = ensureOption(
          merged,
          data?.top_category_id || data?.topCategoryId
            ? {
                id: data?.top_category_id ?? data?.topCategoryId,
                name:
                  data?.top_category_name ||
                  data?.topCategoryName ||
                  data?.top_category_label ||
                  data?.topCategoryLabel ||
                  (typeof data?.top_category === "string" ? data.top_category : undefined),
              }
            : null,
          data?.top_category_name ||
            data?.topCategoryName ||
            data?.top_category_label ||
            data?.topCategoryLabel ||
            t("productForm.fallbacks.selectedTopCategory"),
        )

        if (isMounted) {
          setTopCategories(merged.filter(Boolean))
        }
      } catch (error) {
        console.error('Error loading top categories:', error)
        if (isMounted) {
          setTopCategories([])
        }
      } finally {
        if (isMounted) {
          setLoadingTopCategories(false)
        }
      }
    }

    loadTopCategories()

    return () => {
      isMounted = false
    }
  }, [data, t])

  const toNumberOptional = (value) => {
    if (value === null || value === undefined || value === "") return undefined
    if (typeof value === "number") return value
    if (typeof value === "string") {
      const parsed = Number(value.replace(/\s/g, ""))
      return Number.isNaN(parsed) ? value : parsed
    }
    return value
  }

  const ProductValidation = z.object({
    name: z
      .string()
      .refine(
        (value) => hasMultilingualContent(parseMultilingual(value)),
        t("productForm.fields.name") + " " + t("clientForm.fields.required"),
      ),
    category_id: z.string().min(1, t("productForm.fields.category") + " " + t("clientForm.fields.required")),
    top_category_id: z.string().optional(),
    warranty_value: z.string().optional(),
    warranty_unit: z.string().optional(),
    price_currency: z.string().min(1, t("productForm.fields.currency", { defaultValue: "Currency" })),
    price: z.preprocess(toNumberOptional, z.number({ invalid_type_error: t("productForm.fields.price") }).min(0, t("clientForm.fields.invalid"))),
    description: z.string().optional(),
    serial_number: z.string().optional(),
    shtrix_number: z.string().optional(),
    discount: z.preprocess(toNumberOptional, z.number().optional()),
    count: z.preprocess(toNumberOptional, z.number({ invalid_type_error: t("productForm.fields.stockCount") }).min(0, t("clientForm.fields.invalid"))),
    ndc: z.preprocess(toNumberOptional, z.number().optional()),
    tax: z.preprocess(toNumberOptional, z.number({ invalid_type_error: t("productForm.fields.tax") }).min(0, t("clientForm.fields.invalid"))),
  })

  const initialDescription = useMemo(
    () => serializeDescriptionState(parseDescriptionState(data?.description)),
    [data],
  )

  const initialWarranty = useMemo(
    () => parseWarrantyParts(data?.warranty || data?.guarantee || ""),
    [data],
  )

  const form = useForm({
    resolver: zodResolver(ProductValidation),
    defaultValues: {
      name: data?.name || "",
      category_id: data?.category_id?.toString() || data?.category?.id?.toString() || "",
      top_category_id: data?.top_category_id?.toString() || data?.top_category?.id?.toString() || "",
      warranty_value: initialWarranty.warranty_value,
      warranty_unit: initialWarranty.warranty_unit,
      price_currency: data?.currency || data?.price_currency || "UZS",
      price: data?.price !== undefined && data?.price !== null ? String(data?.price) : "",
      description: initialDescription,
      serial_number: data?.serial_number || "",
      shtrix_number: data?.shtrix_number || data?.barcode || "",
      discount: data?.discount !== undefined && data?.discount !== null ? String(data?.discount) : "",
      count: data?.count !== undefined && data?.count !== null ? String(data?.count) : "0",
      ndc: data?.NDC !== undefined && data?.NDC !== null ? String(data?.NDC) : "",
      tax: data?.tax !== undefined && data?.tax !== null ? String(data?.tax) : "0",
    },
    mode: "onSubmit",
  })

  const selectedTopCategoryId = form.watch("top_category_id")
  const selectedCategoryId = form.watch("category_id")

  const filteredCategories = useMemo(() => {
    if (!selectedTopCategoryId) return categories
    return categories.filter((category) => {
      const linkedTopCategoryId =
        resolveRecordId(category?.raw?.top_category_id) ||
        resolveRecordId(category?.raw?.topCategoryId) ||
        resolveRecordId(category?.top_category_id)
      return linkedTopCategoryId === selectedTopCategoryId
    })
  }, [categories, selectedTopCategoryId])

  useEffect(() => {
    const currentCategoryId = form.getValues("category_id")
    if (!currentCategoryId) return

    const currentCategory = categories.find((category) => category.id === currentCategoryId)
    if (!currentCategory) return

    const linkedTopCategoryId =
      resolveRecordId(currentCategory?.raw?.top_category_id) ||
      resolveRecordId(currentCategory?.raw?.topCategoryId) ||
      resolveRecordId(currentCategory?.top_category_id)

    if (linkedTopCategoryId && form.getValues("top_category_id") !== linkedTopCategoryId) {
      form.setValue("top_category_id", linkedTopCategoryId, { shouldDirty: true, shouldValidate: true })
    }
  }, [categories, form, selectedCategoryId])

  useEffect(() => {
    const currentCategoryId = form.getValues("category_id")
    if (!currentCategoryId || !selectedTopCategoryId) return

    const currentCategory = categories.find((category) => category.id === currentCategoryId)
    const linkedTopCategoryId =
      resolveRecordId(currentCategory?.raw?.top_category_id) ||
      resolveRecordId(currentCategory?.raw?.topCategoryId) ||
      resolveRecordId(currentCategory?.top_category_id)

    if (linkedTopCategoryId && linkedTopCategoryId !== selectedTopCategoryId) {
      form.setValue("category_id", "", { shouldDirty: true, shouldValidate: true })
    }
  }, [categories, form, selectedTopCategoryId, selectedCategoryId])

  const onSubmit = async (values) => {
    setIsLoading(true)

    try {
      // Validate that at least one image is uploaded
      if (images.length === 0) {
        toastWarning({ title: t("productForm.messages.imageRequired") })
        setIsLoading(false)
        return
      }

      // Prepare product data
      const nameMultilingual = parseMultilingual(values.name)
      const priceValue = typeof values.price === "number" ? values.price : Number(values.price || 0)
      const warrantyValue = buildWarrantyPayload(values.warranty_value, values.warranty_unit || "months")

      const productData = {
        name: stringifyMultilingual(nameMultilingual),
        category_id: values.category_id,
        top_category_id: values.top_category_id || undefined,
        currency: values.price_currency || "UZS",
        warranty: warrantyValue,
        guarantee: warrantyValue,
        price: priceValue,
        description: serializeDescriptionState(parseDescriptionState(values.description)),
        serial_number: values.serial_number?.trim() || "",
        shtrix_number: values.shtrix_number?.trim() || "",
        discount:
          values.discount === undefined || values.discount === null
            ? null
            : Number(values.discount),
        count: Number(values.count ?? 0),
        NDC:
          values.ndc === undefined || values.ndc === null
            ? null
            : Number(values.ndc),
        tax: Number(values.tax ?? 0),
        images: images.map((img) => img.path || img.url || img.preview),
      }

      let result
      if (isEdit) {
        result = await updateProduct(productId, productData)
        toastSuccess({ title: t("productForm.messages.updated") })
      } else {
        result = await createProduct(productData)
        toastSuccess({ title: t("productForm.messages.created") })
      }

      router.push('/dashboard/products')
    } catch (error) {
      console.error("Error saving product:", error)
      toastError({
        title: t("productForm.messages.saveError"),
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onInvalidSubmit = (errors) => {
    const firstMessage = Object.values(errors || {})[0]?.message
    toastError({
      title: t("productForm.messages.validationError", { defaultValue: "Проверьте обязательные поля" }),
      description: firstMessage || t("productForm.messages.validationErrorDescription", { defaultValue: "Заполните обязательные поля формы и попробуйте снова." }),
    })
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteProduct(productId)
      toastSuccess({ title: t("productForm.messages.deleted") })
      router.push('/dashboard/products')
    } catch (error) {
      console.error("Error deleting product:", error)
      toastError({
        title: t("productForm.messages.deleteError"),
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <FormLanguageProvider initialLanguage={i18n.language}>
      <div className='figma-form mx-auto w-[95%] max-w-[1240px] py-5'>
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackLinkButton href="/dashboard/products" />
          <div>
            <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
              {isAdd && t("productForm.titles.add")}
              {isEdit && t("productForm.titles.edit")}
              {isReadonly && t("productForm.titles.show")}
            </h1>
            <p className="mt-3 text-[12px] text-[var(--text-secondary)]">{t("productForm.breadcrumb")}</p>
          </div>
        </div>

        {/* Show mode actions */}
        {isReadonly && (
          <div className="flex gap-2">
            <Link href={`/dashboard/products/${productId}?type=edit`}>
              <Button variant="outline" className="h-[40px] gap-2 rounded-[10px]">
                <Edit className="h-4 w-4" />
                {t("productForm.actions.edit")}
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="h-[40px] gap-2 rounded-[10px]">
                  <Trash2 className="h-4 w-4" />
                  {t("productForm.actions.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("productForm.dialog.deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("productForm.dialog.deleteDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("productForm.actions.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t("productForm.actions.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-4">
          <FormLanguageToolbar className="mb-2" />

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">

            {/* LEFT SECTION - Form Fields */}
            <div className="space-y-3">
              {/* Basic Information Card */}
              <Card className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] py-4 shadow-none">
              <CardHeader className="sr-only">
                <CardTitle>{t("productForm.mainInfo")}</CardTitle>
              </CardHeader>
                <CardContent className="space-y-4 px-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("productForm.fields.name")}</FormLabel>
                        <FormControl>
                          <MultilingualInput
                            value={parseMultilingual(field.value)}
                            onChange={(updated) => field.onChange(stringifyMultilingual(updated))}
                            placeholder={t("productForm.placeholders.name")}
                            disabled={isReadonly}
                            className={productInputClass}
                            hideLanguageSwitcher
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-3 text-primary md:grid-cols-2">
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={form.control}
                      name="category_id"
                      label={t("productForm.fields.category")}
                      placeholder={
                        loadingCategories
                          ? t("productForm.placeholders.loading")
                          : selectedTopCategoryId
                            ? t("productForm.placeholders.selectCategory")
                            : t("productForm.placeholders.selectCategory")
                      }
                      required
                      disabled={isReadonly || loadingCategories}
                    >
                      {filteredCategories.map((category) => {
                        const localized =
                          getLocalizedValue(category.name, i18n.language) ||
                          (category.raw
                            ? getLocalizedValue(
                                category.raw.name || category.raw.title,
                                i18n.language,
                              )
                            : "")
                        const label =
                          (typeof localized === "string" && localized.trim().length > 0
                            ? localized
                            : undefined) ||
                          (typeof category.displayName === "string" && category.displayName.trim().length > 0
                            ? category.displayName
                            : category.id)
                        return (
                          <SelectItem key={category.id} value={category.id}>
                            {label}
                          </SelectItem>
                        )
                      })}
                    </CustomFormField>

                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={form.control}
                      name="top_category_id"
                      label={t("productForm.fields.topCategory")}
                      placeholder={loadingTopCategories ? t("productForm.placeholders.loading") : t("productForm.placeholders.selectTopCategory")}
                      disabled={isReadonly || loadingTopCategories}
                    >
                      {topCategories.map((topCategory) => {
                        const localized =
                          getLocalizedValue(topCategory.name, i18n.language) ||
                          (topCategory.raw
                            ? getLocalizedValue(
                                topCategory.raw.name || topCategory.raw.title,
                                i18n.language,
                              )
                            : "")
                        const label =
                          (typeof localized === "string" && localized.trim().length > 0
                            ? localized
                            : undefined) ||
                          (typeof topCategory.displayName === "string" &&
                          topCategory.displayName.trim().length > 0
                            ? topCategory.displayName
                            : topCategory.id)
                        return (
                          <SelectItem key={topCategory.id} value={topCategory.id}>
                            {label}
                          </SelectItem>
                        )
                      })}
                    </CustomFormField>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="warranty_value"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>{t("productForm.fields.warrantyPeriod", { defaultValue: "Срок гарантии" })}</FormLabel>
                          <div className="grid grid-cols-[1fr_180px] gap-3">
                            <FormControl>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder={t("productForm.placeholders.warrantyValue", { defaultValue: "Например: 24" })}
                                disabled={isReadonly}
                                {...field}
                                onFocus={(event) => {
                                  if (String(field.value || "").trim() === "0") {
                                    field.onChange("")
                                  }
                                }}
                                onChange={(event) => {
                                  field.onChange(event.target.value.replace(/\D/g, ""))
                                }}
                                className={productInputClass}
                              />
                            </FormControl>
                            <FormField
                              control={form.control}
                              name="warranty_unit"
                              render={({ field: unitField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Select value={unitField.value || "months"} onValueChange={unitField.onChange} disabled={isReadonly}>
                                      <SelectTrigger className={productInputClass}>
                                        <SelectValue placeholder={t("productForm.fields.warrantyUnit", { defaultValue: "Единица" })} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {WARRANTY_UNITS.map((unit) => (
                                          <SelectItem key={unit} value={unit}>
                                            {t(`productForm.warrantyUnits.${unit}`, { defaultValue: unit })}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <p className="text-[12px] text-[var(--text-secondary)]">
                            {t("productForm.messages.warrantyHint", { defaultValue: "Укажите число и единицу измерения, чтобы было понятно: дни, месяцы или годы." })}
                          </p>
                          {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>{t("productForm.fields.price", { defaultValue: "Цена" })}<span className="text-red-500">{t("clientForm.fields.required")}</span></FormLabel>
                          <div className="grid grid-cols-[1fr_160px] gap-3">
                            <FormControl>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                disabled={isReadonly}
                                value={formatMoneyInput(field.value)}
                                onFocus={() => {
                                  if (normalizeMoneyInput(field.value) === "0") {
                                    field.onChange("")
                                  }
                                }}
                                onChange={(event) => {
                                  field.onChange(normalizeMoneyInput(event.target.value))
                                }}
                                className={productInputClass}
                              />
                            </FormControl>
                            <FormField
                              control={form.control}
                              name="price_currency"
                              render={({ field: currencyField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Select value={currencyField.value || "UZS"} onValueChange={currencyField.onChange} disabled={isReadonly}>
                                      <SelectTrigger className={productInputClass}>
                                        <SelectValue placeholder={t("productForm.fields.currency", { defaultValue: "Валюта" })} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {currencyReferenceOptions.map((currency) => (
                                          <SelectItem key={currency.id} value={currency.id}>
                                            {currency.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <p className="text-[12px] text-[var(--text-secondary)]">
                            {t("productForm.messages.priceHint", { defaultValue: "Сначала укажите сумму, затем выберите валюту цены." })}
                          </p>
                          {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <CustomFormField
                      fieldType={FormFieldType.INPUT}
                      control={form.control}
                      name="serial_number"
                      label={t("productForm.fields.serialNumber")}
                      placeholder={t("productForm.placeholders.serialNumber")}
                      disabled={isReadonly}
                      inputClass={productInputClass}
                    />
                    <CustomFormField
                      fieldType={FormFieldType.INPUT}
                      control={form.control}
                      name="shtrix_number"
                      label={t("productForm.fields.barcode")}
                      placeholder={t("productForm.placeholders.barcode")}
                      disabled={isReadonly}
                      inputClass={productInputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <CustomFormField
                      fieldType={FormFieldType.NUMBER}
                      control={form.control}
                      name="discount"
                      label={t("productForm.fields.discount")}
                      placeholder="0"
                      disabled={isReadonly}
                      inputClass={productInputClass}
                    />
                    <CustomFormField
                      fieldType={FormFieldType.NUMBER}
                      control={form.control}
                      name="count"
                      label={t("productForm.fields.stockCount")}
                      placeholder="0"
                      disabled={isReadonly}
                      inputClass={productInputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <CustomFormField
                      fieldType={FormFieldType.NUMBER}
                      control={form.control}
                      name="ndc"
                      label={t("productForm.fields.vat")}
                      placeholder="0"
                      disabled={isReadonly}
                      inputClass={productInputClass}
                    />
                    <CustomFormField
                      fieldType={FormFieldType.NUMBER}
                      control={form.control}
                      name="tax"
                      label={t("productForm.fields.tax")}
                      placeholder="0"
                      disabled={isReadonly}
                      inputClass={productInputClass}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Description Card */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <ProductDescriptionEditor
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isReadonly}
                  />
                )}
              />

            </div>

            {/* RIGHT SECTION - Images Upload */}
            <div>
              {isReadonly ? (
                <Card className="sticky top-14 h-fit rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] py-3 shadow-[var(--surface-shadow)]">
                  <CardHeader>
                    <CardTitle className="text-lg">{t("productForm.fields.imagesTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {images.map((image) => (
                          <div
                            key={image.id}
                            className="relative aspect-square overflow-hidden rounded-[10px] border border-[var(--border-default)]"
                          >
                            <img
                              src={image.preview}
                              alt={image.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        {t("productForm.fields.noImages")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <AddImages
                  images={images}
                  setImages={setImages}
                  maxImages={10}
                  title={t("productForm.fields.imagesTitle")}
                  infoText={t("productForm.messages.imageUploadHint")}
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {!isReadonly && (
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/products')}
                disabled={isLoading}
                className="h-[44px] w-full min-w-0 rounded-[10px] border-[var(--border-default)] px-5 text-[13px] font-medium sm:w-auto sm:min-w-[132px]"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading} className="h-[44px] w-full min-w-0 rounded-[10px] bg-[var(--surface-elevated)] px-5 text-[13px] font-medium text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border-default)] hover:bg-[var(--surface-hover)] sm:w-auto sm:min-w-[148px]">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {t("dealAdd.buttons.saving", { defaultValue: "Saving..." })}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isEdit ? t("dealAdd.buttons.save") : t("dealAdd.buttons.create")}
                  </span>
                )}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  </FormLanguageProvider>
  )
}
