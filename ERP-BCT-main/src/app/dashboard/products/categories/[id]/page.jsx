"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import CategoryForm from "@/components/forms/CategoryForm"
import { getCategoryById } from "@/lib/actions"

export default function CategoryDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const categoryId = params.id
  const type = searchParams?.get("type") || "show"

  const [categoryData, setCategoryData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true)
      try {
        const category = await getCategoryById(categoryId)
        setCategoryData(category.data || category)
      } catch (err) {
        console.error("Error fetching category:", err)
        setError(err.message || "Не удалось загрузить категорию")
      } finally {
        setLoading(false)
      }
    }

    if (categoryId) {
      fetchCategory()
    }
  }, [categoryId])

  if (loading) {
    return (
      <div className="mx-auto w-11/12 max-w-4xl py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !categoryData) {
    return (
      <div className="mx-auto w-11/12 max-w-4xl py-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Категория не найдена</h1>
        <p className="text-muted-foreground">
          {error || `Категория с ID ${categoryId} не найдена в базе данных.`}
        </p>
      </div>
    )
  }

  const pageType = type === "edit" ? "edit" : "show"

  return <CategoryForm type={pageType} data={categoryData} categoryId={categoryId} />
}
