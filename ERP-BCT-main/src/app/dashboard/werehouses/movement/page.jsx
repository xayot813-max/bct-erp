import WarehouseInventoryClient from "@/components/warehouse/WarehouseInventoryClient"

export default function WarehouseMovementPage() {
  return (
    <WarehouseInventoryClient
      titleKey="warehouse.links.movement.title"
      headingKey="warehouse.chooseProduct"
      showWriteoffAction={false}
      primaryAction="move"
    />
  )
}
