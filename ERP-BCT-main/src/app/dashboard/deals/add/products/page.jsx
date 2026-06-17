import DealCategoriesView from "./_components/DealCategoriesView"

import { getCategories } from "@/lib/actions"
import { extractArrayFromResponse, resolveFirstFileUrl } from "@/lib/utils/api-helpers"
import { getLocalizedValue } from "@/lib/multilingual"

const normaliseCategory = (category, index) => {
  if (!category || typeof category !== "object") {
    return {
      id: `category-${index}`,
      name: null,
      description: null,
      image: "",
      index: index + 1,
    }
  }

  const record = category
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

  const name =
    getLocalizedValue(record.name) ||
    record.title ||
    record.label ||
    ""

  const description =
    getLocalizedValue(record.description) || record.description || record.comment || ""

  const images =
    record.images ??
    record.image ??
    record.photo ??
    record.photos ??
    record.files ??
    record.gallery ??
    record.attachments ??
    []
  const image = resolveFirstFileUrl(images)

  return {
    id: String(id),
    name: (typeof name === "string" && name.trim().length > 0) ? name : null,
    description: (typeof description === "string" && description.trim().length > 0) ? description : null,
    image,
    index: index + 1,
  }
}

export default async function DealProductCategoriesPage({ searchParams }) {
  const awaitedSearch = await searchParams
  const response = await getCategories({ limit: 200 })
  const categoriesRaw = extractArrayFromResponse(response, ["categories"])
  const categories = (categoriesRaw.length > 0 ? categoriesRaw : response?.categories || [])
    .map((item, index) => normaliseCategory(item, index))
    .filter((item) => item?.id)

  const query = new URLSearchParams(awaitedSearch || {})
  const querySuffix = query.toString() ? `?${query.toString()}` : ""
  const backHref = query.get("returnTo") || "/dashboard/deals/add"

  return (
    <div className="min-h-screen bg-[var(--background-primary)] py-10">
      <DealCategoriesView categories={categories} querySuffix={querySuffix} backHref={backHref} />
    </div>
  )
}
