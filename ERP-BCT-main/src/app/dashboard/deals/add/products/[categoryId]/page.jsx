import { notFound } from "next/navigation"

import { getCategoryById, getProducts } from "@/lib/actions"
import { extractArrayFromResponse, resolveFirstFileUrl } from "@/lib/utils/api-helpers"
import { getLocalizedValue } from "@/lib/multilingual"
import CategoryProductsView from "../_components/CategoryProductsView"

const normaliseProduct = (product, index) => {
  if (!product || typeof product !== "object") {
    return {
      id: `product-${index}`,
      name: null,
      price: 0,
      guarantee: "",
      serialNumber: "",
      description: "",
      image: "",
      count: 0,
      index: index + 1,
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

  const price = Number(
    record.price ??
      record.cost ??
      record.base_price ??
      (Array.isArray(record.prices) ? record.prices[0] : 0),
  )

  const images =
    record.images ??
    record.image ??
    record.photos ??
    record.photo ??
    record.files ??
    record.gallery ??
    record.attachments ??
    []

  const resolvedName =
    getLocalizedValue(record.name) ||
    record.title ||
    record.label ||
    ""

  const resolvedDescription =
    getLocalizedValue(record.description) || record.description || ""

  const summary =
    getLocalizedValue(record.ads_title) ||
    record.ads_title ||
    resolvedDescription

  return {
    id: String(id),
    name: resolvedName && resolvedName.trim().length > 0 ? resolvedName : null,
    price,
    guarantee:
      getLocalizedValue(record.guarantee) ??
      getLocalizedValue(record.warranty) ??
      record.guarantee ??
      record.warranty ??
      "",
    serialNumber: record.serial_number || record.serial || "",
    description: summary && summary.trim().length > 0 ? summary : "",
    image: resolveFirstFileUrl(images),
    count: Number(record.count ?? record.quantity ?? 0),
    index: index + 1,
  }
}

const normaliseCategory = (category) => {
  if (!category || typeof category !== "object") {
    return { id: "", name: null }
  }
  const id =
    category.id ??
    category._id ??
    category.uuid ??
    category.guid ??
    category.ID ??
    category.Id ??
    category.code ??
    category.value ??
    ""
  return {
    id: String(id),
    name: getLocalizedValue(category.name) || category.title || null,
  }
}

export default async function CategoryProductsPage({ params, searchParams }) {
  const { categoryId } = await params
  const [categoryResponse, productsResponse] = await Promise.all([
    getCategoryById(categoryId),
    getProducts({ category_id: categoryId, limit: 200 }),
  ])

  if (!categoryResponse) {
    notFound()
  }

  const category = normaliseCategory(categoryResponse?.data || categoryResponse)
  const productsRaw = extractArrayFromResponse(productsResponse, ["products"])
  const products = (productsRaw.length > 0 ? productsRaw : productsResponse?.products || [])
    .map((item, index) => normaliseProduct(item, index))
    .filter((item) => item?.id)

  const query = new URLSearchParams(await searchParams)
  const querySuffix = query.toString() ? `?${query.toString()}` : ""

  return (
    <div className="min-h-screen bg-[var(--background-primary)] py-10">
      <CategoryProductsView category={category} products={products} querySuffix={querySuffix} />
    </div>
  )
}
