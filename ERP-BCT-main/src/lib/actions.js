"use server"

import {
  productService,
  categoryService,
  topCategoryService,
  fileService,
  clientService,
  customerGroupService,
  companyService,
  counterpartyService,
  contractService,
  funnelService,
  warehouseService,
  vendorService,
  financeTransactionService,
} from './api-services'

const createCollectionFallback = (collectionKey, error, extras = {}) => {
  const message =
    (error && typeof error.message === "string" && error.message) ||
    "Не удалось загрузить данные"

  return {
    ok: false,
    error: message,
    message,
    data: [],
    items: [],
    results: [],
    [collectionKey]: [],
    ...extras,
  }
}

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
    return createCollectionFallback("products", error)
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

export async function getInventoryTransactions(params = {}) {
  try {
    return await productService.getStockOperations(params)
  } catch (error) {
    console.error('Error fetching inventory transactions:', error)
    return createCollectionFallback("data", error, { operations: [] })
  }
}

export async function applyProductStockBulk(payload) {
  try {
    return await productService.applyStockBulk(payload)
  } catch (error) {
    console.error('Error applying product stock bulk operation:', error)
    throw error
  }
}

export async function transferProductStock(payload) {
  try {
    return await productService.transferStock(payload)
  } catch (error) {
    console.error('Error transferring product stock:', error)
    throw error
  }
}

export async function writeoffProductStock(payload) {
  try {
    return await productService.writeoffStock(payload)
  } catch (error) {
    console.error('Error writing off product stock:', error)
    throw error
  }
}

export async function saleProductStock(payload) {
  try {
    return await productService.saleStock(payload)
  } catch (error) {
    console.error('Error applying product sale stock operation:', error)
    throw error
  }
}

export async function auditProductStock(payload) {
  try {
    return await productService.auditStock(payload)
  } catch (error) {
    console.error('Error auditing product stock:', error)
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
    return createCollectionFallback("categories", error)
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
    return createCollectionFallback("top_categories", error)
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
    return createCollectionFallback("clients", error)
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

export async function getCustomerGroups(params = {}) {
  try {
    return await customerGroupService.getAll(params)
  } catch (error) {
    console.error("Error fetching customer groups:", error)
    return createCollectionFallback("customer_groups", error)
  }
}

export async function getCustomerGroupAnalytics() {
  try {
    return await customerGroupService.getAnalytics()
  } catch (error) {
    console.error("Error fetching customer group analytics:", error)
    return createCollectionFallback("analytics", error)
  }
}

export async function createCustomerGroup(payload) {
  try {
    return await customerGroupService.create(payload)
  } catch (error) {
    console.error("Error creating customer group:", error)
    throw error
  }
}

export async function updateCustomerGroup(id, payload) {
  try {
    return await customerGroupService.update(id, payload)
  } catch (error) {
    console.error("Error updating customer group:", error)
    throw error
  }
}

export async function deleteCustomerGroup(id) {
  try {
    return await customerGroupService.delete(id)
  } catch (error) {
    console.error("Error deleting customer group:", error)
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
    return createCollectionFallback("companies", error)
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
    return createCollectionFallback("counterparties", error)
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
    return createCollectionFallback("contracts", error)
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
    return await contractService.updateFunnel(id, funnelId)
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
    return createCollectionFallback("funnels", error)
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
    return createCollectionFallback("data", error, { warehouses: [] })
  }
}

export async function getERPTransactions(params = {}) {
  try {
    return await financeTransactionService.getAll(params)
  } catch (error) {
    console.error("Error fetching ERP transactions:", error)
    return createCollectionFallback("data", error, { transactions: [] })
  }
}

export async function createERPTransaction(payload) {
  try {
    return await financeTransactionService.create(payload)
  } catch (error) {
    console.error("Error creating ERP transaction:", error)
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

export async function getVendors(params = {}) {
  try {
    return await vendorService.getAll(params)
  } catch (error) {
    console.error("Error fetching vendors:", error)
    return createCollectionFallback("data", error, { vendors: [] })
  }
}

export async function getVendorById(id) {
  try {
    return await vendorService.getById(id)
  } catch (error) {
    console.error("Error fetching vendor:", error)
    throw error
  }
}

export async function createVendor(payload) {
  try {
    return await vendorService.create(payload)
  } catch (error) {
    console.error("Error creating vendor:", error)
    throw error
  }
}

export async function updateVendor(id, payload) {
  try {
    return await vendorService.update(id, payload)
  } catch (error) {
    console.error("Error updating vendor:", error)
    throw error
  }
}

export async function deleteVendor(id) {
  try {
    return await vendorService.delete(id)
  } catch (error) {
    console.error("Error deleting vendor:", error)
    throw error
  }
}
