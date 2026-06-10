export type NamedOption = {
  id: string
  name: string
}

export type CurrencyOption = {
  id: string
  label: string
  symbol: string
}

export type ProductOption = {
  id: string
  name: string
  category: string
  description: string
  price: number
  vat: number
  discount: number
  image: string
  guarantee: string
  serial: string
}

export const warehouseReferenceOptions: NamedOption[] = [
  { id: "warehouse-1", name: "Склад 1" },
  { id: "warehouse-2", name: "Склад 2" },
  { id: "warehouse-3", name: "Склад 3" },
  { id: "warehouse-4", name: "Склад 4" },
  { id: "warehouse-5", name: "Склад 5" },
]

export const currencyReferenceOptions: CurrencyOption[] = [
  { id: "UZS", label: "UZS", symbol: "сум" },
  { id: "USD", label: "USD", symbol: "$" },
  { id: "EUR", label: "EUR", symbol: "€" },
]
