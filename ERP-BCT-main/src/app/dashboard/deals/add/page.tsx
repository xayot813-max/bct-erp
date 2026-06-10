"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Barcode, CircleX, FilePenLine, Loader2, PackagePlus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import HeaderActions from "@/components/HeaderActions"
import StatusBadges from "@/components/StatusBadges"
import DealForm from "@/components/DealForm"
import DealTable from "@/components/DealTable"
import BackLinkButton from "@/components/shared/BackLinkButton"
import { Button } from "@/components/ui/button"
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
import {
  createContract,
  deleteContract,
  getContractById,
  updateContract,
} from "@/lib/actions"
import { toastSuccess, toastError, toastWarning } from "@/lib/toast"

const ZERO_OBJECT_ID = "000000000000000000000000"

const normalizeDocumentList = (value: unknown): string[] => {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>
          return record.url || record.path || record.href || record.file
        }
        return ""
      })
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    return normalizeDocumentList(record.files || record.documents || record.data || record.url)
  }

  if (typeof value === "string") return [value]

  return []
}

export default function CreateDealPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()

  const formData = useDealStore((state) => state.formData)
  const dealProducts = useDealStore((state) => state.dealProducts)
  const resetDeal = useDealStore((state) => state.resetDeal)
  const loadReferenceData = useDealStore((state) => state.loadReferenceData)
  const loadProducts = useDealStore((state) => state.loadProducts)
  const loadFunnels = useDealStore((state) => state.loadFunnels)
  const setFormField = useDealStore((state) => state.setFormField)
  const hydrateFromContract = useDealStore((state) => state.hydrateFromContract)
  const initializeForm = useDealStore((state) => state.initializeForm)

  const contractIdParam = searchParams.get("contractId") ?? ""
  const typeParam = searchParams.get("type") ?? ""
  const funnelIdParam = searchParams.get("funnelId") ?? ""
  const returnToParam = searchParams.get("returnTo") ?? ""
  const backHref = returnToParam.startsWith("/dashboard") ? returnToParam : "/dashboard/deals"
  const isEdit = Boolean(contractIdParam && typeParam === "edit")

  const [submitting, setSubmitting] = useState(false)
  const [loadingContract, setLoadingContract] = useState(isEdit)
  const [deletingContract, setDeletingContract] = useState(false)
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [documents, setDocuments] = useState<string[]>([])

  useEffect(() => {
    loadReferenceData()
    loadProducts()
    loadFunnels()
  }, [loadReferenceData, loadProducts, loadFunnels])

  useEffect(() => {
    initializeForm(isEdit ? "edit" : "create")
  }, [initializeForm, isEdit])

  useEffect(() => {
    if (funnelIdParam && !isEdit) {
      setFormField("funnelId", funnelIdParam)
    }
  }, [funnelIdParam, isEdit, setFormField])

  useEffect(() => {
    if (!isEdit || !contractIdParam) return
    let cancelled = false

    const loadContract = async () => {
      setLoadingContract(true)
      try {
        const response = await getContractById(contractIdParam)
        const contract = (response as any)?.data || response
        if (!contract) {
          throw new Error(t("dealAdd.errors.notFound"))
        }
        if (!cancelled) {
          hydrateFromContract(contract)
          setDocuments(normalizeDocumentList((contract as any)?.documents))
        }
      } catch (error: any) {
        console.error("Failed to load contract:", error)
        if (!cancelled) {
      toastError({
        title: t("dealAdd.errors.load.title"),
        description: error?.message || t("dealAdd.errors.load.description"),
      })
          router.push("/dashboard/deals")
        }
      } finally {
        if (!cancelled) {
          setLoadingContract(false)
        }
      }
    }

    loadContract()

    return () => {
      cancelled = true
    }
  }, [contractIdParam, hydrateFromContract, isEdit, router, t])

  const pageTitle = isEdit ? t("dealAdd.title.edit") : t("dealAdd.title.create")
  const pageDescription = isEdit
    ? t("dealAdd.description.edit")
    : t("dealAdd.description.create")
  const defaultContractLabel = t("dealAdd.defaults.draft")

  const statusLabel = useMemo(() => {
    if (isEdit) {
      return formData.dealAmount ? t("dealAdd.status.inProgress") : t("dealAdd.status.draft")
    }
    return t("dealAdd.status.creating")
  }, [formData.dealAmount, isEdit, t])

  const paymentStatus = useMemo(() => {
    const total = Number(formData.dealAmount || 0)
    const payCard = Number(formData.payCard || 0)
    const payCash = Number(formData.payCash || 0)
    const paid = (Number.isFinite(payCard) ? payCard : 0) + (Number.isFinite(payCash) ? payCash : 0)
    if (Number.isFinite(total) && total > 0 && paid >= total) {
      return t("dealAdd.payment.paid", { defaultValue: "Оплачено" })
    }
    return paid > 0 ? t("dealAdd.payment.partial") : t("dealAdd.payment.unpaid")
  }, [formData.dealAmount, formData.payCard, formData.payCash, t])

  const submitLabel = isEdit ? t("dealAdd.buttons.save") : t("dealAdd.buttons.create")
  const cancelLabel = isEdit ? t("dealAdd.buttons.cancel") : t("dealAdd.buttons.reset")

  const baseQueryString = useMemo(() => {
    const params = new URLSearchParams()
    if (isEdit && contractIdParam) {
      params.set("contractId", contractIdParam)
      params.set("type", "edit")
    }
    const funnelFromForm = formData.funnelId || funnelIdParam
    if (funnelFromForm) {
      params.set("funnelId", funnelFromForm)
    }
    return params.toString()
  }, [contractIdParam, formData.funnelId, funnelIdParam, isEdit])

  const returnToPath = useMemo(() => {
    if (!baseQueryString) return "/dashboard/deals/add"
    return `/dashboard/deals/add?${baseQueryString}`
  }, [baseQueryString])

  const productQuery = useMemo(() => {
    const params = new URLSearchParams(baseQueryString)
    params.set("returnTo", returnToPath)
    return params.toString() ? `?${params.toString()}` : ""
  }, [baseQueryString, returnToPath])

  const handleSaveContract = async () => {
    if (!formData.client || !formData.counterparty || !formData.company) {
      toastWarning({
        title: t("dealAdd.toasts.required.title"),
        description: t("dealAdd.toasts.required.description"),
      })
      return
    }

    if (dealProducts.length === 0) {
      toastWarning({
        title: t("dealAdd.toasts.noProducts.title"),
        description: t("dealAdd.toasts.noProducts.description"),
      })
      return
    }

    setSubmitting(true)
    try {
      const selectedFunnelId = (formData.funnelId || funnelIdParam || "").trim()
      const normalizedFunnelId = selectedFunnelId || ZERO_OBJECT_ID

      const payload = {
        client_id: formData.client,
        counterparty_id: formData.counterparty,
        company_id: formData.company,
        guarantee: formData.guarantee,
        comment: formData.comments,
        contract_number: formData.contractNumber,
        deal_date: formData.plannedShipmentDate
          ? new Date(formData.plannedShipmentDate).toISOString()
          : undefined,
        contract_amount: Number(formData.dealAmount || 0),
        contract_currency: formData.currency,
        funnel_id: normalizedFunnelId,
        pay_card: Number(formData.payCard || 0),
        pay_cash: Number(formData.payCash || 0),
        products: dealProducts.map((product) => ({
          product_id: product.id,
          price: Number(product.price ?? 0),
          quantity: Number(product.quantity ?? 0),
          discount: Number(product.discount ?? 0),
          vat: Number(product.vat ?? 0),
          serial_number: product.serialNumber,
          guarantee: product.guarantee,
        })),
        documents,
      }

      const contractLabel =
        formData.contractNumber || contractIdParam || defaultContractLabel

      if (isEdit && contractIdParam) {
        await updateContract(contractIdParam, payload)
        toastSuccess({
          title: t("dealAdd.toasts.updateSuccess.title"),
          description: t("dealAdd.toasts.updateSuccess.description", {
            number: contractLabel,
          }),
        })
        resetDeal()
        setDocuments([])
      } else {
        await createContract(payload)
        toastSuccess({
          title: t("dealAdd.toasts.createSuccess.title"),
          description: t("dealAdd.toasts.createSuccess.description", {
            number: contractLabel,
          }),
        })
        resetDeal()
        setDocuments([])
      }

      router.push("/dashboard/deals")
    } catch (error: any) {
      console.error("Failed to save contract:", error)
      toastError({
        title: t("dealAdd.toasts.saveError.title"),
        description: error?.message || t("dealAdd.toasts.saveError.description"),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteContract = async () => {
    if (!contractIdParam) return
    setDeletingContract(true)
    try {
      await deleteContract(contractIdParam)
      toastSuccess({ title: t("dealAdd.toasts.deleteSuccess.title") })
      resetDeal()
      setDocuments([])
      router.push("/dashboard/deals")
    } catch (error: any) {
      console.error("Failed to delete contract:", error)
      toastError({
        title: t("dealAdd.toasts.deleteError.title"),
        description: error?.message || t("dealAdd.toasts.deleteError.description"),
      })
    } finally {
      setDeletingContract(false)
    }
  }

  const handleCancel = () => {
    if (isEdit) {
      resetDeal()
      setDocuments([])
      router.push("/dashboard/deals")
    } else {
      resetDeal()
      setDocuments([])
      toastWarning({
        title: t("dealAdd.toasts.reset.title"),
        description: t("dealAdd.toasts.reset.description"),
      })
    }
  }

  const isReady = !isEdit || !loadingContract
  const handleBack = () => {
    resetDeal()
  }

  const handleAddDocuments = async (files: FileList) => {
    if (!files || files.length === 0) return

    setUploadingDocuments(true)
    try {
      const uploadFormData = new FormData()
      Array.from(files).forEach((file) => uploadFormData.append("files", file))

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: uploadFormData,
        credentials: "include",
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || t("dealAdd.actions.documents.errorTitle"))
      }

      const uploadedDocuments = normalizeDocumentList(payload)
      if (uploadedDocuments.length === 0) {
        throw new Error(t("dealAdd.actions.documents.errorTitle"))
      }

      setDocuments((current) => Array.from(new Set([...current, ...uploadedDocuments])))
      toastSuccess({
        title: t("dealAdd.actions.documents.uploadedTitle"),
        description: t("dealAdd.actions.documents.uploadedDescription", { count: uploadedDocuments.length }),
      })
    } catch (error: any) {
      console.error("Document upload error:", error)
      toastError({
        title: t("dealAdd.actions.documents.errorTitle"),
        description: error?.message,
      })
    } finally {
      setUploadingDocuments(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)] py-5">
      <div className="mx-auto flex w-[95%] max-w-[1240px] flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <BackLinkButton href={backHref} onClick={handleBack} />
            <div className="min-w-0">
              <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                {pageTitle}
              </h1>
              <p className="sr-only">{pageDescription}</p>
              <div className="mt-5">
                <HeaderActions
                  onPrintContract={() =>
                    {
                      window.print()
                      toastSuccess({
                        title: t("dealAdd.actions.printSoon.title"),
                        description: t("dealAdd.actions.printSoon.description"),
                      })
                    }
                  }
                  onAddDocument={handleAddDocuments}
                  onCalculateTax={() =>
                    toastWarning({
                      title: t("dealAdd.actions.tax.title"),
                      description: t("dealAdd.actions.tax.description"),
                    })
                  }
                />
                {uploadingDocuments && (
                  <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                    {t("dealAdd.actions.documents.uploading")}
                  </p>
                )}
                {!uploadingDocuments && documents.length > 0 && (
                  <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                    {t("dealAdd.actions.documents.attachedCount", { count: documents.length })}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 pt-0 md:items-end">
            <StatusBadges statusValue={statusLabel} paymentValue={paymentStatus} />
            {isEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex items-center gap-2"
                    disabled={deletingContract}
                  >
                    {deletingContract ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("dealAdd.buttons.deleting")}
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        {t("dealAdd.buttons.deleteDeal")}
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("dealAdd.dialog.delete.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("dealAdd.dialog.delete.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("dealAdd.dialog.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteContract}>
                      {t("dealAdd.dialog.confirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {isEdit && !isReady ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DealForm
              onSubmit={handleSaveContract}
              onCancel={handleCancel}
              isSubmitting={submitting}
              autoSelectFunnel={!isEdit && Boolean(funnelIdParam)}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
            />

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_205px]">
              <div className="space-y-3">
                <DealTable />
                <div className="flex justify-end gap-2">
                  <Link href={`/dashboard/deals/add/products${productQuery}`}>
                    <Button className="h-11 min-w-[180px] gap-2 rounded-[8px] px-5 text-[13px] font-medium shadow-[var(--surface-shadow)]">
                      <PackagePlus className="h-4 w-4" />
                      {t("dealAdd.products.add")}
                    </Button>
                  </Link>
                  <Link href={`/dashboard/deals/add/barcode${productQuery}`}>
                    <Button className="h-11 min-w-[180px] gap-2 rounded-[8px] px-5 text-[13px] font-medium shadow-[var(--surface-shadow)]">
                      <Barcode className="h-4 w-4" />
                      {t("dealAdd.products.scan")}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-5">
                <Button
                  type="button"
                  onClick={handleSaveContract}
                  disabled={submitting}
                  className="h-11 w-full gap-2 rounded-[8px] text-[13px] font-medium shadow-[var(--surface-shadow)]"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePenLine className="h-4 w-4" />}
                  {submitLabel}
                </Button>
                <Button
                  type="button"
                  onClick={handleCancel}
                  disabled={submitting}
                  variant="outline"
                  className="h-11 w-full gap-2 rounded-[8px] text-[13px] font-medium shadow-[var(--surface-shadow)]"
                >
                  <CircleX className="h-4 w-4" />
                  {cancelLabel}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
