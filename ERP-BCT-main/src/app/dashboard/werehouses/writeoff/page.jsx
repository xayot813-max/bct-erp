import { redirect } from "next/navigation"

export default function WarehouseWriteoffPage() {
  redirect("/dashboard/werehouses/transactions?type=writeoff")
}
