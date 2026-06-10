"use client"

import Image from "next/image"

import { Plus } from "lucide-react"

import { useDealStore } from "@/store/dealStore"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatUSD } from "@/lib/utils/currency"

type ProductCardProps = {
  product: {
    id: string
    name: string
    description: string
    category: string
    price: number
    vat: number
    discount: number
    image: string
    guarantee: string
    serial: string
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const addProductToDeal = useDealStore((state) => state.addProductToDeal)

  const handleAddProduct = () => {
    addProductToDeal({
      id: product.id,
      name: product.name,
      price: product.price,
      vat: product.vat,
      discount: product.discount,
      guarantee: product.guarantee,
      serial: product.serial,
      quantity: 1,
    })
  }

  return (
    <Card className="flex h-full flex-col gap-4 rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <CardHeader className="px-6 pb-0">
        <div className="relative h-40 w-full overflow-hidden rounded-lg bg-gray-100">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
      </CardHeader>
      <CardContent className="px-6 py-0">
        <CardTitle className="text-lg font-semibold text-gray-900">
          {product.name}
        </CardTitle>
        <p className="mt-2 text-sm text-gray-500">{product.description || product.category}</p>
        <p className="mt-4 text-base font-semibold text-gray-900">{formatUSD(product.price)}</p>
      </CardContent>
      <CardFooter className="mt-auto flex justify-between px-6 pb-6">
        <span className="text-sm font-medium text-gray-600">{product.category}</span>
        <Button
          type="button"
          className="flex items-center gap-2 bg-black px-4 py-2 text-white hover:bg-black/80"
          onClick={handleAddProduct}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardFooter>
    </Card>
  )
}
