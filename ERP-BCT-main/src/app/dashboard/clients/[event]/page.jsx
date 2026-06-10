"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import ClientForm from "@/components/forms/ClientForm"
import { PageShell, PageTitle } from "@/components/shared/PageShell"
import { getClientById } from "@/lib/actions"

export default function ClientEventPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const event = params.event
  const typeParam = searchParams?.get("type")

  const isAdd = event === "add"
  const pageType = isAdd ? "add" : typeParam === "edit" ? "edit" : "show"

  const clientId = !isAdd ? event : null
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(!isAdd)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!clientId) return

    const fetchClient = async () => {
      setLoading(true)
      try {
        const response = await getClientById(clientId)
        const data = response?.data || response
        setClientData(data)
      } catch (err) {
        console.error("Failed to fetch client:", err)
        setError(err?.message || "Не удалось загрузить клиента")
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [clientId])

  if (!isAdd && loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    )
  }

  if (!isAdd && (error || !clientData)) {
    return (
      <PageShell className="space-y-6">
        <PageTitle className="text-[40px]">Клиент не найден</PageTitle>
        <p className="text-muted-foreground">
          {error || `Клиент с ID ${clientId} не найден или был удалён.`}
        </p>
      </PageShell>
    )
  }

  return <ClientForm type={pageType} data={clientData} clientId={clientId} />
}
