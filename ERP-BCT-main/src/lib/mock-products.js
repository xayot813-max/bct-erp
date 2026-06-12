export const TEST_PRODUCTS = [
  {
    id: "mock-product-1",
    name: "BCT Smart Terminal",
    category_name: "POS Systems",
    warehouse_id: "warehouse-1",
    warehouse: "Склад 1",
    count: 7,
    price: 2499000,
    currency: "UZS",
    created_at: "2026-06-02T10:00:00.000Z",
    stock_by_warehouse: {
      "warehouse-1": 7,
    },
  },
  {
    id: "mock-product-2",
    name: "Honeywell Voyager 1470g",
    category_name: "Barcode Scanners",
    warehouse_id: "warehouse-2",
    warehouse: "Склад 2",
    count: 22,
    price: 890000,
    currency: "UZS",
    created_at: "2026-06-02T11:00:00.000Z",
    stock_by_warehouse: {
      "warehouse-2": 22,
    },
  },
  {
    id: "mock-product-3",
    name: "Zebra ZD220 Label Printer",
    category_name: "Label Printers",
    warehouse_id: "warehouse-1",
    warehouse: "Склад 1",
    count: 4,
    price: 1780000,
    currency: "UZS",
    created_at: "2026-06-02T12:00:00.000Z",
    stock_by_warehouse: {
      "warehouse-1": 4,
    },
  },
  {
    id: "mock-product-4",
    name: "Cash Drawer CD-410",
    category_name: "POS Systems",
    warehouse_id: "warehouse-3",
    warehouse: "Склад 3",
    count: 9,
    price: 620000,
    currency: "UZS",
    created_at: "2026-06-03T09:30:00.000Z",
    stock_by_warehouse: {
      "warehouse-3": 9,
    },
  },
  {
    id: "mock-product-5",
    name: "XPrinter XP-58IIH",
    category_name: "Receipt Printers",
    warehouse_id: "warehouse-2",
    warehouse: "Склад 2",
    count: 13,
    price: 540000,
    currency: "UZS",
    created_at: "2026-06-04T14:15:00.000Z",
    stock_by_warehouse: {
      "warehouse-2": 13,
    },
  },
]

export const getFallbackProducts = () => TEST_PRODUCTS.map((item) => ({ ...item }))
