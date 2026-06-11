import { redirect } from "next/navigation"

export default function WarehouseMovementPage() {
  redirect("/dashboard/werehouses/transactions?type=movement")
}
