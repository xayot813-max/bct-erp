import WarehouseInventoryClient from "@/components/warehouse/WarehouseInventoryClient"

export default function WarehouseWriteoffPage() {
  return (
    <WarehouseInventoryClient
      titleKey="warehouse.writeoffCreateTitle"
      headingKey="warehouse.chooseProduct"
      showMoveAction={false}
      showWriteoffAction={true}
      primaryAction="writeoff"
    />
  )
}
