"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Minus, Plus } from "lucide-react"

import { useDealStore } from "@/store/dealStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/utils/currency"

type ProductFormProps = {
  product: {
    id: string
    name: string
    price: number
    vat: number
    discount: number
    guarantee: string
    serial: string
  }
  onAdd?: () => void
  onCancel?: () => void
}

export default function ProductForm({ product, onAdd, onCancel }: ProductFormProps) {
  const router = useRouter()
  const addProductToDeal = useDealStore((state) => state.addProductToDeal)
  const currency = useDealStore((state) => state.formData.currency)

  const [serialNumber, setSerialNumber] = useState(product.serial || "")
  const [guarantee, setGuarantee] = useState(product.guarantee || "")
  const [quantity, setQuantity] = useState<number>(1)
  const [price, setPrice] = useState<number>(product.price)

  const handleQuantityChange = (change: number) => {
    setQuantity((prev) => Math.max(1, prev + change))
  }

  const handleAddProduct = () => {
    addProductToDeal({
      id: product.id,
      name: product.name,
      price,
      vat: product.vat,
      discount: product.discount,
      guarantee,
      serial: product.serial,
      serialNumber,
      quantity,
    })
    onAdd?.()
    router.push("/dashboard/deals/add")
  }

  const handleCancel = () => {
    onCancel?.()
    router.push("/dashboard/deals/add/products")
  }

  return (
    <div className="grid gap-6 md:grid-cols-[60%_40%]">
      <Card className="border-none bg-white shadow-sm">
        <CardHeader className="px-6 pb-0">
          <CardTitle className="text-xl font-semibold text-gray-900">
            Product Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Product Name</label>
            <Input
              value={product.name}
              readOnly
              className="h-12 rounded-md border border-gray-300 bg-gray-100 text-gray-900"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Serial Number</label>
            <Input
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              placeholder="Enter serial number"
              className="h-12 rounded-md border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Guarantee</label>
            <Input
              value={guarantee}
              onChange={(event) => setGuarantee(event.target.value)}
              placeholder="Enter guarantee details"
              className="h-12 rounded-md border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Quantity</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
              className="h-12 rounded-md border border-gray-300 bg-white text-gray-900"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-white shadow-sm">
        <CardContent className="flex h-full flex-col justify-between px-6 py-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Product Price</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(event) => setPrice(Math.max(0, Number(event.target.value)))}
                className="h-12 rounded-md border border-gray-300 bg-white text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Quantity</span>
              <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 rounded-full border-gray-300"
                  onClick={() => handleQuantityChange(-1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold text-gray-900">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 rounded-full border-gray-300"
                  onClick={() => handleQuantityChange(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatMoney(quantity * price, currency)}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              type="button"
              className="w-full bg-black px-6 py-3 text-white hover:bg-black/80"
              onClick={handleAddProduct}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border border-gray-300 px-6 py-3 text-gray-900 hover:bg-muted"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
