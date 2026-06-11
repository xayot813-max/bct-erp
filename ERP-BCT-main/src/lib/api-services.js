import apiClient, { API_BASE_ORIGIN, API_BASE_URL } from './api-client'

/**
 * Product API Services
 */
export const productService = {
  /**
   * Get all products with pagination, search, and filters
   * @param {object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search keyword
   * @param {number} params.category_id - Filter by category ID
   * @param {number} params.top_category_id - Filter by top category ID
   * @returns {Promise<{data: Array, total: number, page: number, limit: number}>}
   */
  async getAll(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)
    if (params.category_id) queryParams.append('category_id', params.category_id)
    if (params.top_category_id) queryParams.append('top_category_id', params.top_category_id)
    if (params.shtrix_number) queryParams.append('shtrix_number', params.shtrix_number)

    const queryString = queryParams.toString()
    const endpoint = `/products${queryString ? `?${queryString}` : ''}`

    return apiClient.get(endpoint)
  },

  /**
   * Get a single product by ID
   * @param {number|string} id - Product ID
   * @returns {Promise<object>}
   */
  async getById(id) {
    return apiClient.get(`/products/${id}`)
  },

  /**
   * Create a new product
   * @param {object} productData - Product data
   * @returns {Promise<object>}
   */
  async create(productData) {
    return apiClient.post('/products', productData)
  },

  /**
   * Update an existing product
   * @param {number|string} id - Product ID
   * @param {object} productData - Updated product data
   * @returns {Promise<object>}
   */
  async update(id, productData) {
    return apiClient.put(`/products/${id}`, productData)
  },

  /**
   * Apply an inventory operation to a product.
   * @param {number|string} id - Product ID
   * @param {object} stockData - Stock operation payload
   * @returns {Promise<object>}
   */
  async adjustStock(id, stockData) {
    return apiClient.patch(`/products/${id}/stock`, stockData)
  },

  async applyStockBulk(payload) {
    return apiClient.post('/products/stock/bulk', payload)
  },

  async transferStock(payload) {
    return apiClient.post('/products/stock/transfer', payload)
  },

  async writeoffStock(payload) {
    return apiClient.post('/products/stock/writeoff', payload)
  },

  async saleStock(payload) {
    return apiClient.post('/products/stock/bulk', { ...payload, type: 'sale' })
  },

  async auditStock(payload) {
    return apiClient.post('/products/stock/audit', payload)
  },

  /**
   * Delete a product
   * @param {number|string} id - Product ID
   * @returns {Promise<object>}
   */
  async delete(id) {
    return apiClient.delete(`/products/${id}`)
  },
}

/**
 * Shared helpers
 */
const buildQueryString = (params = {}) => {
  const queryParams = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, value)
    }
  })
  const queryString = queryParams.toString()
  return queryString ? `?${queryString}` : ""
}

/**
 * Category API Services
 */
export const categoryService = {
  /**
   * Get all categories with pagination and filters
   * @param {object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {number} params.top_category_id - Filter by top category ID
   * @returns {Promise<{data: Array, total: number, page: number, limit: number}>}
   */
  async getAll(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.top_category_id) queryParams.append('top_category_id', params.top_category_id)

    const queryString = queryParams.toString()
    const endpoint = `/categories${queryString ? `?${queryString}` : ''}`

    return apiClient.get(endpoint)
  },

  /**
   * Get a single category by ID
   * @param {number|string} id - Category ID
   * @returns {Promise<object>}
   */
  async getById(id) {
    return apiClient.get(`/categories/${id}`)
  },

  /**
   * Create a new category
   * @param {object} categoryData - Category data
   * @returns {Promise<object>}
   */
  async create(categoryData) {
    return apiClient.post('/categories', categoryData)
  },

  /**
   * Update an existing category
   * @param {number|string} id - Category ID
   * @param {object} categoryData - Updated category data
   * @returns {Promise<object>}
   */
  async update(id, categoryData) {
    return apiClient.put(`/categories/${id}`, categoryData)
  },

  /**
   * Delete a category
   * @param {number|string} id - Category ID
   * @returns {Promise<object>}
   */
  async delete(id) {
    return apiClient.delete(`/categories/${id}`)
  },
}

/**
 * Top Category API Services
 */
export const topCategoryService = {
  /**
   * Get all top categories with pagination
   * @param {object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @returns {Promise<{data: Array, total: number, page: number, limit: number}>}
   */
  async getAll(params = {}) {
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)

    const queryString = queryParams.toString()
    const endpoint = `/top-categories${queryString ? `?${queryString}` : ''}`

    return apiClient.get(endpoint)
  },

  /**
   * Get a single top category by ID
   * @param {number|string} id - Top category ID
   * @returns {Promise<object>}
   */
  async getById(id) {
    return apiClient.get(`/top-categories/${id}`)
  },

  /**
   * Create a new top category
   * @param {object} categoryData - Top category data
   * @returns {Promise<object>}
   */
  async create(categoryData) {
    return apiClient.post('/top-categories', categoryData)
  },

  /**
   * Update an existing top category
   * @param {number|string} id - Top category ID
   * @param {object} categoryData - Updated top category data
   * @returns {Promise<object>}
   */
  async update(id, categoryData) {
    return apiClient.put(`/top-categories/${id}`, categoryData)
  },

  /**
   * Delete a top category
   * @param {number|string} id - Top category ID
   * @returns {Promise<object>}
   */
  async delete(id) {
    return apiClient.delete(`/top-categories/${id}`)
  },
}

/**
 * File Upload API Services
 */
export const fileService = {
  /**
   * Upload a single file
   * @param {File} file - File to upload
   * @param {function} onProgress - Progress callback (optional)
   * @returns {Promise<{url: string, filename: string, size: number}>}
   */
  async uploadSingle(file, onProgress) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      const message =
        typeof payload === 'string'
          ? payload || 'Upload failed'
          : payload?.message || payload?.error || 'Upload failed'
      throw new Error(message)
    }

    return typeof payload === 'string' ? { url: payload } : payload
  },

  /**
   * Upload multiple files
   * @param {File[]} files - Array of files to upload
   * @param {function} onProgress - Progress callback (optional)
   * @returns {Promise<{files: Array, count: number}>}
   */
  async uploadMultiple(files, onProgress) {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      const message =
        typeof payload === 'string'
          ? payload || 'Upload failed'
          : payload?.message || payload?.error || 'Upload failed'
      throw new Error(message)
    }

    if (typeof payload === 'string') {
      return {
        files: [{ url: payload }],
        count: 1,
      }
    }

    if (payload && !Array.isArray(payload) && !payload.files && payload.url) {
      return {
        files: [payload],
        count: 1,
      }
    }

    if (Array.isArray(payload)) {
      return {
        files: payload,
        count: payload.length,
      }
    }

    return payload
  },

  /**
   * Get full URL for an uploaded file
   * @param {string} path - File path (e.g., "/uploads/filename.jpg")
   * @returns {string}
   */
  getFileUrl(path) {
    if (!path) return ""
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
      return path
    }
    const normalizedPath = path.startsWith("/") ? path : `/${path}`
    const envBase =
      (process.env.NEXT_PUBLIC_IMG_URL || "").replace(/\/$/, "") ||
      API_BASE_ORIGIN.replace(/\/$/, "")
    return `${envBase}${normalizedPath}`
  },
}

const ADMIN_BASE_URL =
  (API_BASE_URL || "").replace(/\/$/, "") ||
  `${API_BASE_ORIGIN.replace(/\/$/, "")}/api`

const resolveAdminPath = (path = "") => {
  const normalized = typeof path === "string" ? path.trim() : ""
  if (!normalized) return "admin"
  const withoutLeadingSlash = normalized.startsWith("/") ? normalized.slice(1) : normalized
  return withoutLeadingSlash === "admin" || withoutLeadingSlash.startsWith("admin/")
    ? withoutLeadingSlash
    : `admin/${withoutLeadingSlash}`
}

const adminFetch = async (path, { token, method = "GET", body } = {}) => {
  const headers = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const isBrowser = typeof window !== "undefined"
  const adminPath = resolveAdminPath(path)
  const fetchUrl = isBrowser ? `/api/${adminPath}` : `${ADMIN_BASE_URL}/${adminPath}`

  const response = await fetch(fetchUrl, {
    method,
    headers,
    credentials: "include",
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  })

  const contentType = response.headers.get("content-type") || ""
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text()
  const isHtmlPayload =
    typeof payload === "string" && /<!doctype html|<html[\s>]/i.test(payload.trim().slice(0, 120))

  if (!response.ok) {
    const message =
      isHtmlPayload
        ? "Не удалось получить JSON от API администраторов. Проверьте маршрут backend и авторизацию."
        : typeof payload === "string"
          ? payload || "Admin request failed"
        : payload?.message || payload?.error || "Admin request failed"
    throw new Error(message)
  }

  if (isHtmlPayload) {
    throw new Error("API администраторов вернул HTML вместо JSON.")
  }

  return payload
}

export const adminService = {
  async list(token) {
    return adminFetch("/admins", { token })
  },
  async create(payload, token) {
    return adminFetch("/admins", {
      method: "POST",
      token,
      body: payload,
    })
  },
  async updateById(id, payload, token) {
    return adminFetch(`/admins/${id}`, {
      method: "PUT",
      token,
      body: payload,
    })
  },
  async deleteById(id, token) {
    return adminFetch(`/admins/${id}`, {
      method: "DELETE",
      token,
    })
  },
  async login(credentials) {
    return adminFetch("/admin/login", {
      method: "POST",
      body: credentials,
    })
  },
  async profile(token) {
    return adminFetch("/admin/profile", {
      method: "GET",
      token,
    })
  },
  async update(payload, token) {
    return adminFetch("/admin/update", {
      method: "PUT",
      token,
      body: payload,
    })
  },
}

/**
 * Helper function to build image URLs from API responses
 * @param {string|Array} images - Image path or array of image objects
 * @returns {Array<{url: string, preview: string, path?: string, id: string}>}
 */
export const buildImageUrls = (images) => {
  if (!images) return []

  if (typeof images === 'string') {
    return [{
      id: '1',
      url: fileService.getFileUrl(images),
      preview: fileService.getFileUrl(images),
      path: images,
    }]
  }

  if (Array.isArray(images)) {
    return images.map((img, index) => ({
      id: img.id || `${index + 1}`,
      url: typeof img === 'string' ? fileService.getFileUrl(img) : fileService.getFileUrl(img.url),
      preview: typeof img === 'string' ? fileService.getFileUrl(img) : fileService.getFileUrl(img.url),
      path: typeof img === 'string' ? img : img.url,
      name: img.name || `Image ${index + 1}`,
    }))
  }

  return []
}

/**
 * Client API Services
 */
export const clientService = {
  async getAll(params = {}) {
    const endpoint = `/clients${buildQueryString(params)}`
    return apiClient.get(endpoint)
  },

  async getById(id) {
    return apiClient.get(`/clients/${id}`)
  },

  async create(payload) {
    return apiClient.post(`/clients`, payload)
  },

  async update(id, payload) {
    return apiClient.put(`/clients/${id}`, payload)
  },

  async delete(id) {
    return apiClient.delete(`/clients/${id}`)
  },
}

/**
 * Company API Services
 */
export const companyService = {
  async getAll(params = {}) {
    const endpoint = `/companies${buildQueryString(params)}`
    return apiClient.get(endpoint)
  },

  async getById(id) {
    return apiClient.get(`/companies/${id}`)
  },

  async create(payload) {
    return apiClient.post(`/companies`, payload)
  },

  async update(id, payload) {
    return apiClient.put(`/companies/${id}`, payload)
  },

  async delete(id) {
    return apiClient.delete(`/companies/${id}`)
  },
}

/**
 * Counterparty API Services
 */
export const counterpartyService = {
  async getAll(params = {}) {
    const endpoint = `/counterparties${buildQueryString(params)}`
    return apiClient.get(endpoint)
  },

  async getById(id) {
    return apiClient.get(`/counterparties/${id}`)
  },

  async create(payload) {
    return apiClient.post(`/counterparties`, payload)
  },

  async update(id, payload) {
    return apiClient.put(`/counterparties/${id}`, payload)
  },

  async delete(id) {
    return apiClient.delete(`/counterparties/${id}`)
  },
}

/**
 * Contract API Services
 */
export const contractService = {
  async getAll(params = {}) {
    const endpoint = `/contracts${buildQueryString(params)}`
    return apiClient.get(endpoint)
  },

  async getById(id) {
    return apiClient.get(`/contracts/${id}`)
  },

  async create(payload) {
    return apiClient.post(`/contracts`, payload)
  },

  async update(id, payload) {
    return apiClient.put(`/contracts/${id}`, payload)
  },

  async delete(id) {
    return apiClient.delete(`/contracts/${id}`)
  },
}

/**
 * Funnel API Services
 */
export const funnelService = {
  async getAll(params = {}) {
    const endpoint = `/funnels${buildQueryString(params)}`
    return apiClient.get(endpoint)
  },

  async getById(id) {
    return apiClient.get(`/funnels/${id}`)
  },

  async create(payload) {
    return apiClient.post(`/funnels`, payload)
  },

  async update(id, payload) {
    return apiClient.put(`/funnels/${id}`, payload)
  },

  async delete(id) {
    return apiClient.delete(`/funnels/${id}`)
  },
}

/**
 * Warehouse API Services
 */
export const warehouseService = {
  async getAll(params = {}) {
    const endpoint = `/warehouses${buildQueryString(params)}`
    return apiClient.get(endpoint)
  },

  async getById(id) {
    return apiClient.get(`/warehouses/${id}`)
  },

  async create(payload) {
    return apiClient.post(`/warehouses`, payload)
  },

  async update(id, payload) {
    return apiClient.put(`/warehouses/${id}`, payload)
  },

  async delete(id) {
    return apiClient.delete(`/warehouses/${id}`)
  },
}
