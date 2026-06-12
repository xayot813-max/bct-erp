import { create } from "zustand"

import {
  warehouseReferenceOptions,
  currencyReferenceOptions,
  type NamedOption,
  type CurrencyOption,
  type ProductOption,
} from "@/lib/reference-data"
import {
  getClients,
  getCompanies,
  getCounterparties,
  getProducts,
  getFunnels,
} from "@/lib/actions"
import { getCurrentAdminProfileId } from "@/lib/profile-test-data"

type DealFormData = {
  client: string
  counterparty: string
  company: string
  warehouse: string
  funnelId: string
  contractNumber: string
  plannedShipmentDate: string
  dealAmount: string
  currency: string
  payCard: string
  payCash: string
  comments: string
  guarantee: string
}

type DealProduct = {
  id: string
  uid: string
  name: string
  serialNumber: string
  quantity: number
  price: number
  vat: number
  discount: number
  guarantee: string
}

type AddProductPayload = Partial<DealProduct> &
  Pick<ProductOption, "id" | "name" | "price" | "vat" | "discount" | "guarantee" | "serial"> & {
    quantity?: number
    serialNumber?: string
  }

type FunnelOption = {
  id: string
  name: string
  color: string
  comment?: string
  order?: number
}

type DealStore = {
  formData: DealFormData
  dealProducts: DealProduct[]
  clients: NamedOption[]
  counterparties: NamedOption[]
  companies: NamedOption[]
  warehouses: NamedOption[]
  currencies: CurrencyOption[]
  products: ProductOption[]
  funnels: FunnelOption[]
  referenceLoading: boolean
  referenceError?: string
  referenceLoaded: boolean
  productsLoading: boolean
  productsError?: string
  productsLoaded: boolean
  funnelsLoading: boolean
  funnelsError?: string
  funnelsLoaded: boolean
  formInitialized: boolean
  setFormField: (field: keyof DealFormData, value: string) => void
  addProductToDeal: (payload: AddProductPayload) => void
  removeProductFromDeal: (uid: string) => void
  resetDeal: () => void
  initializeForm: (mode: "create" | "edit") => void
  setFormDataState: (payload: Partial<DealFormData>) => void
  setDealProducts: (payload: DealProduct[]) => void
  hydrateFromContract: (contract: unknown) => void
  getProductById: (id: string) => ProductOption | undefined
  loadReferenceData: (force?: boolean) => Promise<void>
  loadProducts: () => Promise<void>
  loadFunnels: (force?: boolean) => Promise<void>
}

const createUid = (id: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${id}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const initialFormData: DealFormData = {
  client: "",
  counterparty: "",
  company: "",
  warehouse: "",
  contractNumber: "",
  plannedShipmentDate: "",
  dealAmount: "",
  currency: currencyReferenceOptions[0].id,
  funnelId: "",
  payCard: "",
  payCash: "",
  comments: "",
  guarantee: "",
}

const resolveId = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const candidate =
      record.id ??
      record._id ??
      record.uuid ??
      record.guid ??
      record.ID ??
      record.Id ??
      record.code
    if (candidate !== undefined) {
      return String(candidate)
    }
  }
  return ""
}

const toNamedOption = (item: unknown, fallback: string = "—"): NamedOption => {
  if (!item || typeof item !== "object") {
    return { id: "", name: fallback }
  }
  const record = item as Record<string, unknown>
  const id = resolveId(record)
  const firstName = record.first_name ?? record.firstname ?? record.firstName
  const lastName = record.last_name ?? record.lastname ?? record.lastName
  const composedName = [firstName, lastName]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim()
  const name =
    composedName ||
    (typeof record.name === "string" ? record.name : undefined) ||
    (typeof record.company === "string" ? record.company : undefined) ||
    (typeof record.title === "string" ? record.title : undefined) ||
    (typeof record.label === "string" ? record.label : undefined) ||
    fallback
  return { id, name }
}

const extractArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    const candidate =
      record.data ??
      record.items ??
      record.results ??
      record.list ??
      record.rows ??
      record.entries ??
      record.clients ??
      record.counterparties ??
      record.companies ??
      record.contracts ??
      record.products ??
      record.funnels
    if (Array.isArray(candidate)) {
      return candidate
    }
  }
  return []
}

const normalizeFunnelId = (value: unknown): string => {
  const ZERO_OBJECT_ID = "000000000000000000000000"
  if (value === null || value === undefined) return ""
  const stringified = String(value).trim()
  if (
    !stringified ||
    stringified === ZERO_OBJECT_ID ||
    stringified === "null" ||
    stringified === "undefined"
  ) {
    return ""
  }
  return stringified
}

const toDateInputValue = (value: unknown): string => {
  if (!value) return ""
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

const toDealProduct = (item: unknown, index: number): DealProduct | null => {
  if (!item || typeof item !== "object") return null
  const record = item as Record<string, unknown>
  const productId =
    resolveId(record.product_id) ||
    resolveId(record.product) ||
    resolveId(record.id) ||
    resolveId(record.productId)
  if (!productId) return null

  const productRecord =
    (record.product && typeof record.product === "object"
      ? (record.product as Record<string, unknown>)
      : undefined) || undefined

  const name =
    (productRecord?.name as string) ||
    (productRecord?.title as string) ||
    (typeof record.product_name === "string" ? record.product_name : undefined) ||
    (typeof record.name === "string" ? record.name : undefined) ||
    `Товар ${index + 1}`

  return {
    id: productId,
    uid: createUid(`${productId}-${index}`),
    name,
    serialNumber:
      (typeof record.serial_number === "string" && record.serial_number) ||
      (typeof record.serial === "string" && record.serial) ||
      "-",
    quantity: Number(record.quantity ?? record.count ?? 1),
    price: Number(record.price ?? record.cost ?? productRecord?.price ?? 0),
    vat: Number(record.vat ?? record.NDC ?? 0),
    discount: Number(record.discount ?? 0),
    guarantee:
      (typeof record.guarantee === "string" && record.guarantee) ||
      (typeof record.warranty === "string" && record.warranty) ||
      "",
  }
}

export const useDealStore = create<DealStore>((set, get) => ({
  formData: initialFormData,
  dealProducts: [],
  clients: [],
  counterparties: [],
  companies: [],
  warehouses: warehouseReferenceOptions,
  currencies: currencyReferenceOptions,
  products: [],
  funnels: [],
  referenceLoading: false,
  referenceLoaded: false,
  productsLoading: false,
  productsLoaded: false,
  funnelsLoading: false,
  funnelsLoaded: false,
  formInitialized: false,
  setFormField: (field, value) =>
    set((state) => ({
      formData: {
        ...state.formData,
        [field]: value,
      },
    })),
  addProductToDeal: (payload) =>
    set((state) => {
      const entry: DealProduct = {
        id: payload.id,
        uid: createUid(payload.id),
        name: payload.name,
        serialNumber: payload.serialNumber || payload.serial || "-",
        quantity: Number(payload.quantity ?? 1),
        price: Number(payload.price ?? 0),
        vat: Number(payload.vat ?? 0),
        discount: Number(payload.discount ?? 0),
        guarantee: payload.guarantee || "",
      }

      return {
        dealProducts: [...state.dealProducts, entry],
      }
    }),
  removeProductFromDeal: (uid) =>
    set((state) => ({
      dealProducts: state.dealProducts.filter((item) => item.uid !== uid),
    })),
  resetDeal: () =>
    set({
      formData: initialFormData,
      dealProducts: [],
      formInitialized: false,
    }),
  initializeForm: (mode) =>
    set((state) => {
      if (state.formInitialized && mode === "create") {
        return {}
      }
      if (mode === "create") {
        return {
          formData: initialFormData,
          dealProducts: [],
          formInitialized: true,
        }
      }
      return {
        formInitialized: true,
      }
    }),
  setFormDataState: (payload) =>
    set(() => ({
      formData: {
        ...initialFormData,
        ...payload,
        currency: payload.currency ?? initialFormData.currency,
      },
      formInitialized: true,
    })),
  setDealProducts: (items) =>
    set(() => ({
      dealProducts: items,
      formInitialized: true,
    })),
  hydrateFromContract: (contract) => {
    if (!contract || typeof contract !== "object") return
    const record = contract as Record<string, unknown>

    const clientId =
      resolveId(record.client_id) ||
      resolveId(record.client) ||
      resolveId(record.clientId)
    const counterpartyId =
      resolveId(record.counterparty_id) ||
      resolveId(record.counterparty) ||
      resolveId(record.counterpartyId)
    const companyId =
      resolveId(record.company_id) ||
      resolveId(record.company) ||
      resolveId(record.companyId)
    const funnelId =
      normalizeFunnelId(record.funnel_id) ||
      normalizeFunnelId(record.funnelId) ||
      (record.funnel && typeof record.funnel === "object"
        ? normalizeFunnelId(
            (record.funnel as Record<string, unknown>).id ??
              (record.funnel as Record<string, unknown>)._id ??
              (record.funnel as Record<string, unknown>).uuid ??
              (record.funnel as Record<string, unknown>).guid ??
              (record.funnel as Record<string, unknown>).ID ??
              (record.funnel as Record<string, unknown>).Id ??
              (record.funnel as Record<string, unknown>).code,
          )
        : "")

    let rawProducts = extractArray(record.products)
    if (rawProducts.length === 0) {
      rawProducts = extractArray(record.items)
    }
    if (rawProducts.length === 0) {
      rawProducts = extractArray(record.positions)
    }

    const dealProducts = rawProducts
      .map((item, index) => toDealProduct(item, index))
      .filter((item): item is DealProduct => Boolean(item && item.id))

    set({
      formData: {
        ...initialFormData,
        client: clientId,
        counterparty: counterpartyId,
        company: companyId,
        funnelId,
        warehouse: resolveId(record.warehouse_id ?? record.warehouse),
        contractNumber:
          (typeof record.contract_number === "string" && record.contract_number) ||
          (typeof record.contractNumber === "string" && record.contractNumber) ||
          "",
        plannedShipmentDate: toDateInputValue(
          record.deal_date ?? record.dealDate ?? record.shipment_date,
        ),
        dealAmount: String(
          record.contract_amount ?? record.amount ?? record.total ?? initialFormData.dealAmount,
        ),
        currency:
          (typeof record.contract_currency === "string" && record.contract_currency) ||
          initialFormData.currency,
        payCard: String(record.pay_card ?? record.card ?? ""),
        payCash: String(record.pay_cash ?? record.cash ?? ""),
        comments:
          (typeof record.comment === "string" && record.comment) ||
          (typeof record.description === "string" && record.description) ||
          "",
        guarantee:
          (typeof record.guarantee === "string" && record.guarantee) ||
          (typeof record.warranty === "string" && record.warranty) ||
          "",
      },
      dealProducts,
      formInitialized: true,
    })
  },
  getProductById: (id) => get().products.find((product) => product.id === id),
  loadReferenceData: async (force = false) => {
    const { referenceLoaded, referenceLoading } = get()
    if (!force && (referenceLoaded || referenceLoading)) return

    set({ referenceLoading: true, referenceError: undefined })
    try {
      const [clientsResponse, counterpartiesResponse, companiesResponse] = await Promise.all([
        getClients({ limit: 200 }),
        getCounterparties({ limit: 200 }),
        getCompanies({ limit: 200 }),
      ])

      const clients = extractArray(clientsResponse)
        .map((item) => toNamedOption(item))
        .filter((option) => option.id)
      const counterparties = extractArray(counterpartiesResponse)
        .map((item) => toNamedOption(item))
        .filter((option) => option.id)
      const companies = extractArray(companiesResponse)
        .map((item) => toNamedOption(item))
        .filter((option) => option.id)

      set({
        clients,
        counterparties,
        companies,
        referenceLoading: false,
        referenceLoaded: true,
      })
      await get().loadFunnels(force)
    } catch (error: any) {
      console.error("Error loading reference data:", error)
      set({
        referenceError: error?.message || "Не удалось загрузить справочные данные",
        referenceLoading: false,
      })
    }
  },
  loadProducts: async () => {
    const { productsLoaded, productsLoading } = get()
    if (productsLoaded || productsLoading) return

    set({ productsLoading: true, productsError: undefined })
    try {
      const response = await getProducts({
        limit: 200,
        owner_admin_id: getCurrentAdminProfileId(),
        is_test_data: true,
      })
      const raw = extractArray(response)

      const products: ProductOption[] = raw.map((item, index) => {
        const record = item as Record<string, unknown>
        const id = resolveId(record) || `${index + 1}`
        const rawImages = record.image ?? record.images
        const images = Array.isArray(rawImages)
          ? rawImages
          : typeof rawImages === "string"
            ? [rawImages]
            : []
        const categoryName =
          (typeof record.category_name === "string" && record.category_name) ||
          (record.category && typeof (record.category as Record<string, unknown>).name === "string"
            ? ((record.category as Record<string, unknown>).name as string)
            : undefined)
        return {
          id,
          name:
            (typeof record.name === "string" && record.name) ||
            (typeof record.title === "string" && record.title) ||
            `Product ${index + 1}`,
          category: categoryName || "—",
          description: typeof record.description === "string" ? record.description : "",
          price: Number(record.price ?? 0),
          vat: Number(record.vat ?? record.NDC ?? 0),
          discount: Number(record.discount ?? 0),
          image: typeof images[0] === "string" ? (images[0] as string) : "",
          guarantee: typeof record.guarantee === "string" ? record.guarantee : "",
          serial:
            (typeof record.serial_number === "string" && record.serial_number) ||
            (typeof record.serial === "string" && record.serial) ||
            "",
        }
      }).filter((product) => product.id)

      set({
        products,
        productsLoading: false,
        productsLoaded: true,
      })
    } catch (error: any) {
      console.error("Error loading products:", error)
      set({
        productsError: error?.message || "Не удалось загрузить товары",
        productsLoading: false,
      })
    }
  },
  loadFunnels: async (force = false) => {
    const { funnelsLoaded, funnelsLoading } = get()
    if (!force && (funnelsLoaded || funnelsLoading)) return

    set({ funnelsLoading: true, funnelsError: undefined })
    try {
      const response = await getFunnels({ limit: 200 })
      const raw = extractArray(response)
      const funnels: FunnelOption[] = raw
        .map((item, index) => {
          if (!item || typeof item !== "object") return undefined
          const record = item as Record<string, unknown>
          const id = resolveId(record) || `${index + 1}`
          const name = typeof record.name === "string" ? record.name : `Column ${index + 1}`
          const color = typeof record.color === "string" ? record.color : "#5B6FDD"
          const funnel: FunnelOption = { id, name, color }
          if (typeof record.comment === "string") {
            funnel.comment = record.comment
          }
          const orderValue = Number(record.order ?? index)
          if (!Number.isNaN(orderValue)) {
            funnel.order = orderValue
          }
          return funnel
        })
        .filter((item): item is FunnelOption => Boolean(item))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

      set({
        funnels,
        funnelsLoading: false,
        funnelsLoaded: true,
      })
    } catch (error: any) {
      console.error("Error loading funnels:", error)
      set({
        funnelsError: error?.message || "Не удалось загрузить воронки",
        funnelsLoading: false,
      })
    }
  },
}))

export type { DealFormData, DealProduct }
