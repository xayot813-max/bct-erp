import { notFound } from "next/navigation"

import FunnelForm from "@/components/forms/FunnelForm"
import { getFunnelById } from "@/lib/actions"

const normalizeFunnel = (funnel) => {
  if (!funnel || typeof funnel !== "object") return null

  const id =
    funnel.id ??
    funnel._id ??
    funnel.uuid ??
    funnel.guid ??
    funnel.ID ??
    funnel.Id ??
    funnel.code

  if (!id) return null

  return {
    id: String(id),
    name: typeof funnel.name === "string" ? funnel.name : "",
    color: typeof funnel.color === "string" ? funnel.color : "#FFFFFF",
    comment: typeof funnel.comment === "string" ? funnel.comment : "",
    order: Number(funnel.order ?? 0),
  }
}

export default async function EditFunnelPage({ params }) {
  const { id } = await params
  const response = await getFunnelById(id)
  const funnel = normalizeFunnel(response?.data || response)

  if (!funnel) {
    notFound()
  }

  return <FunnelForm mode="edit" funnelId={funnel.id} initialData={funnel} />
}
