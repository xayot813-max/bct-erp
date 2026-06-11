import { redirect } from "next/navigation"

export default function WarehouseReceiptPage() {
  redirect("/dashboard/werehouses/transactions?type=receipt")
}
