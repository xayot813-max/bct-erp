"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import CompanyForm from "@/components/forms/CompanyForm"
import { PageShell, PageTitle } from "@/components/shared/PageShell"
import { getCompanyById } from "@/lib/actions"

export default function CompanyEventPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const event = params.event
  const typeParam = searchParams?.get("type")

  const isAdd = event === "add"
  const pageType = isAdd ? "add" : typeParam === "edit" ? "edit" : "show"
  const companyId = !isAdd ? event : null

  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(!isAdd)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!companyId) return

    const fetchCompany = async () => {
      setLoading(true)
      try {
        const response = await getCompanyById(companyId)
        setCompany(response?.data || response)
      } catch (err) {
        console.error("Failed to fetch company:", err)
        setError(err?.message || "Не удалось загрузить компанию")
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [companyId])

  if (!isAdd && loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    )
  }

  if (!isAdd && (error || !company)) {
    return (
      <PageShell className="space-y-6">
        <PageTitle className="text-[40px]">Компания не найдена</PageTitle>
        <p className="text-muted-foreground">
          {error || `Компания с ID ${companyId} не найдена или была удалена.`}
        </p>
      </PageShell>
    )
  }

  return <CompanyForm type={pageType} data={company} companyId={companyId} />
}
