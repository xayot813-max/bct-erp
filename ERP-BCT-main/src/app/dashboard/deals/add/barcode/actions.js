'use server'

import { getProducts } from "@/lib/actions"
import { extractArrayFromResponse, getFileUrl } from "@/lib/utils/api-helpers"
import { getLocalizedValue } from "@/lib/multilingual"

const normaliseProduct = (product, index) => {
  if (!product || typeof product !== "object") {
    return {
      id: `product-${index}`,
      name: `Товар ${index + 1}`,
      price: 0,
      guarantee: "",
      serialNumber: "",
      count: 0,
      vat: 0,
      discount: 0,
      description: "",
      image: "",
    }
  }

  const record = product
  const id =
    record.id ??
    record._id ??
    record.uuid ??
    record.guid ??
    record.ID ??
    record.Id ??
    record.code ??
    record.value ??
    index + 1

  const images = record.images ?? record.image ?? record.photos ?? record.files ?? []
  const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : images

  return {
    id: String(id),
    name:
      getLocalizedValue(record.name) ||
      record.title ||
      record.label ||
      `Товар ${index + 1}`,
    price: Number(record.price ?? record.cost ?? 0),
    guarantee:
      getLocalizedValue(record.guarantee) ??
      getLocalizedValue(record.warranty) ??
      record.guarantee ??
      record.warranty ??
      "",
    serialNumber: record.serial_number || record.serial || "",
    count: Number(record.count ?? record.quantity ?? 0),
    vat: Number(record.NDC ?? record.vat ?? 0),
    discount: Number(record.discount ?? 0),
    description: getLocalizedValue(record.description) || record.description || "",
    barcode: record.shtrix_number || record.barcode || "",
    image: typeof firstImage === "string" ? getFileUrl(firstImage) : getFileUrl(firstImage?.url),
  }
}

export async function searchProductsByBarcode(prevState, formData) {
  const barcode = formData.get("barcode")?.toString().trim() || ""

  if (!barcode) {
    return {
      ...prevState,
      error: "Введите штрих код для поиска",
      items: [],
    }
  }

  try {
    const response = await getProducts({ shtrix_number: barcode, limit: 20 })
    const raw = extractArrayFromResponse(response, ["products"])
    let products = (raw.length > 0 ? raw : response?.products || [])
      .map((item, index) => normaliseProduct(item, index))
      .filter((item) => item?.id)

    if (products.length === 0) {
      const fallbackResponse = await getProducts({ search: barcode, limit: 20 })
      const fallbackRaw = extractArrayFromResponse(fallbackResponse, ["products"])
      products = (fallbackRaw.length > 0 ? fallbackRaw : fallbackResponse?.products || [])
        .map((item, index) => normaliseProduct(item, index))
        .filter((item) => item?.id)
    }

    if (products.length === 0) {
      return {
        items: [],
        error: "Товары с таким штрих кодом не найдены",
      }
    }

    return { items: products, error: null }
  } catch (error) {
    console.error("Barcode search error:", error)
    return {
      items: [],
      error: error?.message || "Не удалось выполнить поиск по штрих коду",
    }
  }
}
