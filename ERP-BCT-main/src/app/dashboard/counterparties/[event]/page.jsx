"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import CounterpartyForm from "@/components/forms/CounterpartyForm"
import { PageShell, PageTitle } from "@/components/shared/PageShell"
import { getCounterpartyById } from "@/lib/actions"

export default function CounterpartyEventPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const event = params.event
  const typeParam = searchParams?.get("type")

  const isAdd = event === "add"
  const pageType = isAdd ? "add" : typeParam === "edit" ? "edit" : "show"
  const counterpartyId = !isAdd ? event : null

  const [counterparty, setCounterparty] = useState(null)
  const [loading, setLoading] = useState(!isAdd)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!counterpartyId) return

    const fetchCounterparty = async () => {
      setLoading(true)
      try {
        const response = await getCounterpartyById(counterpartyId)
        setCounterparty(response?.data || response)
      } catch (err) {
        console.error("Failed to fetch counterparty:", err)
        setError(err?.message || "Не удалось загрузить контрагента")
      } finally {
        setLoading(false)
      }
    }

    fetchCounterparty()
  }, [counterpartyId])

  if (!isAdd && loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    )
  }

  if (!isAdd && (error || !counterparty)) {
    return (
      <PageShell className="space-y-6">
        <PageTitle className="text-[40px]">Контрагент не найден</PageTitle>
        <p className="text-muted-foreground">
          {error || `Контрагент с ID ${counterpartyId} не найден или был удалён.`}
        </p>
      </PageShell>
    )
  }

  return <CounterpartyForm type={pageType} data={counterparty} counterpartyId={counterpartyId} />
}
