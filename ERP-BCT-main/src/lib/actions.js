"use server"

import {
  productService,
  categoryService,
  topCategoryService,
  fileService,
  clientService,
  companyService,
  counterpartyService,
  contractService,
  funnelService,
  warehouseService,
} from './api-services'

const resolveLinkedId = (value) => {
  if (!value) return undefined
  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim()
    return normalized.length > 0 ? normalized : undefined
  }
  if (typeof value === "object") {
    const record = value
    return resolveLinkedId(
      record.id ??
        record._id ??
        record.uuid ??
        record.guid ??
        record.ID ??
        record.Id ??
        record.code,
    )
  }
  return undefined
}

const mapContractProductForUpdate = (item, index = 0) => {
  if (!item || typeof item !== "object") return null
  const record = item
  const productId =
    resolveLinkedId(record.product_id) ??
    resolveLinkedId(record.product) ??
    resolveLinkedId(record.productId) ??
    resolveLinkedId(record.id)
  if (!productId) return null

  const productRecord =
    (record.product && typeof record.product === "object" ? record.product : undefined) || undefined

  return {
    product_id: productId,
    price: Number(
      record.price ??
        record.cost ??
        (productRecord && typeof productRecord === "object" ? productRecord.price : 0),
    ),
    quantity: Number(record.quantity ?? record.count ?? 1),
    discount: Number(record.discount ?? 0),
    vat: Number(record.vat ?? record.NDC ?? 0),
    serial_number:
      (typeof record.serial_number === "string" && record.serial_number) ||
      (typeof record.serial === "string" && record.serial) ||
      "",
    guarantee:
      (typeof record.guarantee === "string" && record.guarantee) ||
      (typeof record.warranty === "string" && record.warranty) ||
      "",
  }
}

/**
 * Server Actions for Products
 */

export async function getProducts(params = {}) {
  try {
    return await productService.getAll(params)
  } catch (error) {
    console.error('Error fetching products:', error)
    throw error
  }
}

export async function getProductById(id) {
  try {
    return await productService.getById(id)
  } catch (error) {
    console.error('Error fetching product:', error)
    throw error
  }
}

export async function createProduct(productData) {
  try {
    return await productService.create(productData)
  } catch (error) {
    console.error('Error creating product:', error)
    throw error
  }
}

export async function updateProduct(id, productData) {
  try {
    return await productService.update(id, productData)
  } catch (error) {
    console.error('Error updating product:', error)
    throw error
  }
}

export async function adjustProductStock(id, stockData) {
  try {
    return await productService.adjustStock(id, stockData)
  } catch (error) {
    console.error('Error adjusting product stock:', error)
    throw error
  }
}

export async function deleteProduct(id) {
  try {
    return await productService.delete(id)
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}

/**
 * Server Actions for Categories
 */

export async function getCategories(params = {}) {
  try {
    return await categoryService.getAll(params)
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
}

export async function getCategoryById(id) {
  try {
    return await categoryService.getById(id)
  } catch (error) {
    console.error('Error fetching category:', error)
    throw error
  }
}

export async function createCategory(categoryData) {
  try {
    return await categoryService.create(categoryData)
  } catch (error) {
    console.error('Error creating category:', error)
    throw error
  }
}

export async function updateCategory(id, categoryData) {
  try {
    return await categoryService.update(id, categoryData)
  } catch (error) {
    console.error('Error updating category:', error)
    throw error
  }
}

export async function deleteCategory(id) {
  try {
    return await categoryService.delete(id)
  } catch (error) {
    console.error('Error deleting category:', error)
    throw error
  }
}

/**
 * Server Actions for Top Categories
 */

export async function getTopCategories(params = {}) {
  try {
    return await topCategoryService.getAll(params)
  } catch (error) {
    console.error('Error fetching top categories:', error)
    throw error
  }
}

export async function getTopCategoryById(id) {
  try {
    return await topCategoryService.getById(id)
  } catch (error) {
    console.error('Error fetching top category:', error)
    throw error
  }
}

export async function createTopCategory(categoryData) {
  try {
    return await topCategoryService.create(categoryData)
  } catch (error) {
    console.error('Error creating top category:', error)
    throw error
  }
}

export async function updateTopCategory(id, categoryData) {
  try {
    return await topCategoryService.update(id, categoryData)
  } catch (error) {
    console.error('Error updating top category:', error)
    throw error
  }
}

export async function deleteTopCategory(id) {
  try {
    return await topCategoryService.delete(id)
  } catch (error) {
    console.error('Error deleting top category:', error)
    throw error
  }
}

/**
 * Server Actions for File Uploads
 */

export async function uploadFile(file) {
  try {
    if (!file) {
      throw new Error('No file provided')
    }
    return await fileService.uploadSingle(file)
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

export async function uploadFiles(files) {
  try {
    if (!files || files.length === 0) {
      throw new Error('No files provided')
    }
    return await fileService.uploadMultiple(files)
  } catch (error) {
    console.error('Error uploading files:', error)
    throw error
  }
}

/**
 * Server Actions for Clients
 */

export async function getClients(params = {}) {
  try {
    return await clientService.getAll(params)
  } catch (error) {
    console.error("Error fetching clients:", error)
    throw error
  }
}

export async function getClientById(id) {
  try {
    return await clientService.getById(id)
  } catch (error) {
    console.error("Error fetching client:", error)
    throw error
  }
}

export async function createClient(payload) {
  try {
    return await clientService.create(payload)
  } catch (error) {
    console.error("Error creating client:", error)
    throw error
  }
}

export async function updateClient(id, payload) {
  try {
    return await clientService.update(id, payload)
  } catch (error) {
    console.error("Error updating client:", error)
    throw error
  }
}

export async function deleteClient(id) {
  try {
    return await clientService.delete(id)
  } catch (error) {
    console.error("Error deleting client:", error)
    throw error
  }
}

/**
 * Server Actions for Companies
 */

export async function getCompanies(params = {}) {
  try {
    return await companyService.getAll(params)
  } catch (error) {
    console.error("Error fetching companies:", error)
    throw error
  }
}

export async function getCompanyById(id) {
  try {
    return await companyService.getById(id)
  } catch (error) {
    console.error("Error fetching company:", error)
    throw error
  }
}

export async function createCompany(payload) {
  try {
    return await companyService.create(payload)
  } catch (error) {
    console.error("Error creating company:", error)
    throw error
  }
}

export async function updateCompany(id, payload) {
  try {
    return await companyService.update(id, payload)
  } catch (error) {
    console.error("Error updating company:", error)
    throw error
  }
}

export async function deleteCompany(id) {
  try {
    return await companyService.delete(id)
  } catch (error) {
    console.error("Error deleting company:", error)
    throw error
  }
}

/**
 * Server Actions for Counterparties
 */

export async function getCounterparties(params = {}) {
  try {
    return await counterpartyService.getAll(params)
  } catch (error) {
    console.error("Error fetching counterparties:", error)
    throw error
  }
}

export async function getCounterpartyById(id) {
  try {
    return await counterpartyService.getById(id)
  } catch (error) {
    console.error("Error fetching counterparty:", error)
    throw error
  }
}

export async function createCounterparty(payload) {
  try {
    return await counterpartyService.create(payload)
  } catch (error) {
    console.error("Error creating counterparty:", error)
    throw error
  }
}

export async function updateCounterparty(id, payload) {
  try {
    return await counterpartyService.update(id, payload)
  } catch (error) {
    console.error("Error updating counterparty:", error)
    throw error
  }
}

export async function deleteCounterparty(id) {
  try {
    return await counterpartyService.delete(id)
  } catch (error) {
    console.error("Error deleting counterparty:", error)
    throw error
  }
}

/**
 * Server Actions for Contracts
 */

export async function getContracts(params = {}) {
  try {
    return await contractService.getAll(params)
  } catch (error) {
    console.error("Error fetching contracts:", error)
    throw error
  }
}

export async function getContractById(id) {
  try {
    return await contractService.getById(id)
  } catch (error) {
    console.error("Error fetching contract:", error)
    throw error
  }
}

export async function createContract(payload) {
  try {
    return await contractService.create(payload)
  } catch (error) {
    console.error("Error creating contract:", error)
    throw error
  }
}

export async function updateContract(id, payload) {
  try {
    return await contractService.update(id, payload)
  } catch (error) {
    console.error("Error updating contract:", error)
    throw error
  }
}

export async function deleteContract(id) {
  try {
    return await contractService.delete(id)
  } catch (error) {
    console.error("Error deleting contract:", error)
    throw error
  }
}

export async function updateContractFunnel(id, funnelId) {
  try {
    const response = await contractService.getById(id)
    const contract = response?.data || response
    if (!contract || typeof contract !== "object") {
      throw new Error("Contract not found")
    }

    const clientId = resolveLinkedId(
      contract.client_id ?? contract.client ?? contract.clientId,
    )
    const counterpartyId = resolveLinkedId(
      contract.counterparty_id ?? contract.counterparty ?? contract.counterpartyId,
    )
    const companyId = resolveLinkedId(
      contract.company_id ?? contract.company ?? contract.companyId,
    )

    if (!clientId || !counterpartyId || !companyId) {
      throw new Error("Не удалось определить связанные сущности сделки")
    }

    let productsRaw = Array.isArray(contract.products) ? contract.products : []
    if (productsRaw.length === 0) {
      productsRaw = Array.isArray(contract.items) ? contract.items : []
    }
    if (productsRaw.length === 0) {
      productsRaw = Array.isArray(contract.positions) ? contract.positions : []
    }

    const products = productsRaw
      .map((item, index) => mapContractProductForUpdate(item, index))
      .filter((item) => Boolean(item))

    const payload = {
      client_id: clientId,
      counterparty_id: counterpartyId,
      company_id: companyId,
      guarantee:
        (typeof contract.guarantee === "string" && contract.guarantee) ||
        (typeof contract.warranty === "string" && contract.warranty) ||
        "",
      comment:
        (typeof contract.comment === "string" && contract.comment) ||
        (typeof contract.description === "string" && contract.description) ||
        "",
      contract_number:
        (typeof contract.contract_number === "string" && contract.contract_number) ||
        (typeof contract.contractNumber === "string" && contract.contractNumber) ||
        "",
      deal_date:
        contract.deal_date ??
        contract.dealDate ??
        contract.shipment_date ??
        contract.shipmentDate ??
        null,
      contract_amount: Number(contract.contract_amount ?? contract.amount ?? 0),
      contract_currency:
        (typeof contract.contract_currency === "string" && contract.contract_currency) ||
        (typeof contract.currency === "string" && contract.currency) ||
        "UZS",
      funnel_id: funnelId ?? null,
      pay_card: Number(contract.pay_card ?? contract.card ?? 0),
      pay_cash: Number(contract.pay_cash ?? contract.cash ?? 0),
      products,
    }

    return await contractService.update(id, payload)
  } catch (error) {
    console.error("Error updating contract funnel:", error)
    throw error
  }
}

/**
 * Server Actions for Funnels
 */

export async function getFunnels(params = {}) {
  try {
    return await funnelService.getAll(params)
  } catch (error) {
    console.error("Error fetching funnels:", error)
    throw error
  }
}

export async function getFunnelById(id) {
  try {
    return await funnelService.getById(id)
  } catch (error) {
    console.error("Error fetching funnel:", error)
    throw error
  }
}

export async function createFunnel(payload) {
  try {
    return await funnelService.create(payload)
  } catch (error) {
    console.error("Error creating funnel:", error)
    throw error
  }
}

export async function updateFunnel(id, payload) {
  try {
    return await funnelService.update(id, payload)
  } catch (error) {
    console.error("Error updating funnel:", error)
    throw error
  }
}

export async function deleteFunnel(id) {
  try {
    return await funnelService.delete(id)
  } catch (error) {
    console.error("Error deleting funnel:", error)
    throw error
  }
}

/**
 * Server Actions for Warehouses
 */

export async function getWarehouses(params = {}) {
  try {
    return await warehouseService.getAll(params)
  } catch (error) {
    console.error("Error fetching warehouses:", error)
    throw error
  }
}

export async function getWarehouseById(id) {
  try {
    return await warehouseService.getById(id)
  } catch (error) {
    console.error("Error fetching warehouse:", error)
    throw error
  }
}

export async function createWarehouse(payload) {
  try {
    return await warehouseService.create(payload)
  } catch (error) {
    console.error("Error creating warehouse:", error)
    throw error
  }
}

export async function updateWarehouse(id, payload) {
  try {
    return await warehouseService.update(id, payload)
  } catch (error) {
    console.error("Error updating warehouse:", error)
    throw error
  }
}

export async function deleteWarehouse(id) {
  try {
    return await warehouseService.delete(id)
  } catch (error) {
    console.error("Error deleting warehouse:", error)
    throw error
  }
}
