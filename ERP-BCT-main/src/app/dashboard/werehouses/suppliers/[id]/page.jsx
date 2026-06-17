"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import SupplierForm from "@/components/forms/SupplierForm"
import { getVendorById } from "@/lib/actions"

export default function SupplierDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const supplierId = params.id
  const type = searchParams?.get("type") || "show"

  const [supplierData, setSupplierData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSupplier = async () => {
      setLoading(true)
      try {
        const response = await getVendorById(supplierId)
        setSupplierData(response?.data || response)
      } catch (err) {
        console.error("Error fetching supplier:", err)
        setError(err?.message || "Failed to load supplier")
      } finally {
        setLoading(false)
      }
    }

    if (supplierId) {
      fetchSupplier()
    }
  }, [supplierId])

  if (loading) {
    return (
      <div className="mx-auto w-11/12 max-w-4xl py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !supplierData) {
    return (
      <div className="mx-auto w-11/12 max-w-4xl py-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Supplier not found</h1>
        <p className="text-muted-foreground">{error || `Supplier with ID ${supplierId} not found.`}</p>
      </div>
    )
  }

  const pageType = type === "edit" ? "edit" : "show"
  return <SupplierForm type={pageType} data={supplierData} supplierId={supplierId} />
}
