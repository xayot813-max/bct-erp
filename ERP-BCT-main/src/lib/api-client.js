const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") return ""
  const trimmed = value.trim().replace(/\/+$/, "")
  return trimmed.length > 0 ? trimmed : ""
}

const hasWindow = typeof window !== "undefined"

const isLocalhostUrl = (value) => {
  try {
    const parsed = new URL(value)
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)
  } catch {
    return false
  }
}

const resolveBrowserApiBaseUrl = (envUrl) => {
  if (!hasWindow) return ""
  const { protocol, hostname } = window.location
  const isNetworkHost = hostname && !["localhost", "127.0.0.1", "::1"].includes(hostname)

  if (isNetworkHost && (!envUrl || isLocalhostUrl(envUrl))) {
    return normalizeBaseUrl(`${protocol}//${hostname}:9000/api`)
  }

  return ""
}

/**
 * Resolve preferred API base URL using environment variables first,
 * then fall back to the current origin (in browser) and known defaults.
 */
const resolveApiBaseUrl = () => {
  const envApiBaseUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL) ||
    normalizeBaseUrl(process.env.API_BASE_URL) ||
    normalizeBaseUrl(process.env.BASE_URL)

  const candidates = [
    resolveBrowserApiBaseUrl(envApiBaseUrl),
    envApiBaseUrl,
  ]

  if (hasWindow) {
    candidates.push(normalizeBaseUrl(`${window.location.origin}/api`))
  } else {
    candidates.push(
      normalizeBaseUrl(
        process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api` : "",
      ),
      normalizeBaseUrl(
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api` : "",
      ),
    )
  }

  candidates.push("http://localhost:9000/api", "https://q-bit.uz/api")

  return candidates.find(Boolean) || "http://localhost:9000/api"
}

const API_BASE_URL = resolveApiBaseUrl()

let API_BASE_ORIGIN = API_BASE_URL
try {
  const parsed = new URL(API_BASE_URL)
  API_BASE_ORIGIN = parsed.origin
} catch {
  if (hasWindow) {
    API_BASE_ORIGIN = window.location.origin
  } else {
    API_BASE_ORIGIN =
      normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/api$/, "")) ||
      normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      API_BASE_URL.replace(/\/api$/, "")
  }
}

/**
 * Custom API client for making HTTP requests
 */
class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL
  }

  /**
   * Get headers for API requests
   * @param {object} customHeaders - Additional headers
   * @returns {object}
   */
  getHeaders(customHeaders = {}) {
    return {
      'Content-Type': 'application/json',
      ...customHeaders,
    }
  }

  /**
   * Make a request to the API
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {object} options - Fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const { headers, ...otherOptions } = options

    const url = `${this.baseURL}${endpoint}`
    const finalHeaders = this.getHeaders(headers)

    try {
      const response = await fetch(url, {
        ...otherOptions,
        headers: finalHeaders,
        credentials: "include",
      })

      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new Error('Unauthorized')
      }

      // Parse response
      const contentType = response.headers.get('content-type')
      let data

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      // Handle error responses
      if (!response.ok) {
        throw new Error(data.message || data.error || `Request failed with status ${response.status}`)
      }

      return data
    } catch (error) {
      if (
        error instanceof TypeError &&
        typeof error.message === "string" &&
        ["Failed to fetch", "fetch failed"].includes(error.message)
      ) {
        const networkError = new Error(
          `Не удалось подключиться к API по адресу ${this.baseURL}. Убедитесь, что backend доступен и URL указан корректно.`,
        )
        console.error('API request error:', networkError)
        throw networkError
      }

      console.error('API request error:', error)
      throw error
    }
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    })
  }

  /**
   * POST request
   */
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    })
  }

  /**
   * PUT request
   */
  async put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    })
  }

  /**
   * PATCH request
   */
  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    })
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    })
  }

  /**
   * Upload files (FormData)
   */
  async upload(endpoint, formData, options = {}) {
    const headers = {
      ...(options.headers || {}),
    }

    // Don't set Content-Type for FormData - browser will set it with boundary
    const isAbsolute = typeof endpoint === "string" && /^https?:\/\//i.test(endpoint)
    const base = API_BASE_ORIGIN.replace(/\/$/, "")
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    const url = isAbsolute ? endpoint : `${base}${path}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: "include",
        ...options,
      })

      if (response.status === 401) {
        throw new Error('Unauthorized')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Upload failed')
      }

      return data
    } catch (error) {
      if (
        error instanceof TypeError &&
        typeof error.message === "string" &&
        ["Failed to fetch", "fetch failed"].includes(error.message)
      ) {
        const networkError = new Error(
          `Не удалось подключиться к API по адресу ${this.baseURL}. Проверьте, что backend доступен и CORS настроен корректно.`,
        )
        console.error('Upload error:', networkError)
        throw networkError
      }

      console.error('Upload error:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()
export { API_BASE_URL, API_BASE_ORIGIN }
export default apiClient
