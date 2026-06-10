"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LegacyDealCategoryPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/deals/add")
  }, [router])

  return null
}
