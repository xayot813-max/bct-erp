"use client"

import React, { useState, useEffect } from 'react'
import ProductForm from '@/components/forms/ProductForm'
import { PageShell, PageTitle } from '@/components/shared/PageShell'
import Link from 'next/link'
import { getProductById } from '@/lib/actions'
import { Loader2 } from 'lucide-react'
import { useParams, useSearchParams } from 'next/navigation'

export default function ProductDetail() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id
  const type = searchParams?.get('type') || 'show'

  const [productData, setProductData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Determine page type
  const getPageType = () => {
    if (type === 'edit') {
      return 'edit'
    } else if (type === 'show') {
      return 'show'
    } else {
      return 'show'
    }
  }

  const pageType = getPageType()

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      try {
        const product = await getProductById(id)
        setProductData(product.data || product)
      } catch (err) {
        console.error('Error fetching product:', err)
        setError(err.message || 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  // Loading state
  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    )
  }

  // Error state or product not found
  if (error || !productData) {
    return (
      <PageShell>
        <div className="text-center py-12">
          <PageTitle className="mb-4 text-[40px]">Товар не найден</PageTitle>
          <p className="text-gray-600 mb-6">
            {error || `Товар с ID ${id} не найден в базе данных.`}
          </p>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center rounded-md border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
          >
            Вернуться к списку товаров
          </Link>
        </div>
      </PageShell>
    )
  }

  return (
    <ProductForm
      type={pageType}
      data={productData}
      productId={id}
    />
  )
}
