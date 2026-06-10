# DataTable Pagination Guide

## Overview
The DataTable component now supports both **client-side** and **server-side** pagination modes.

---

## API Response Structure

Your API should return data in this format:
```json
{
  "data": [...],      // Array of items
  "total": 150,       // Total number of items in database
  "page": 1,          // Current page number
  "limit": 10         // Items per page
}
```

---

## Server-Side Pagination (Recommended for Large Datasets)

Use this mode when data is fetched from an API with pagination support.

### Example Implementation

```jsx
"use client"

import { DataTable } from '@/components/shared/DataTable'
import { useState, useEffect } from 'react'
import { getProducts } from '@/lib/actions'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  })

  // Fetch data from API
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      try {
        const response = await getProducts({
          page: pagination.page,
          limit: pagination.limit,
        })

        setProducts(response.data || [])
        setPagination(prev => ({
          ...prev,
          total: response.total || 0,
        }))
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [pagination.page, pagination.limit])

  // Handle page change
  const handlePageChange = (page, limit) => {
    setPagination(prev => ({ ...prev, page, limit }))
  }

  // Handle limit change
  const handleLimitChange = (limit) => {
    setPagination({ page: 1, limit, total: pagination.total })
  }

  return (
    <DataTable
      columns={columns}
      allData={products}
      defaultItemsPerPage={10}
      totalData={pagination.total}
      serverSide={true}
      onPageChange={handlePageChange}
      onLimitChange={handleLimitChange}
    />
  )
}
```

### Props for Server-Side Mode

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `columns` | `array` | ✅ Yes | Column definitions |
| `allData` | `array` | ✅ Yes | Current page data from API |
| `totalData` | `number` | ✅ Yes | Total items in database (from API response) |
| `serverSide` | `boolean` | ✅ Yes | Set to `true` for server-side pagination |
| `onPageChange` | `function` | ✅ Yes | Callback: `(page, limit) => void` |
| `onLimitChange` | `function` | ✅ Yes | Callback: `(limit) => void` |
| `defaultItemsPerPage` | `number` | ❌ No | Default: `10` |

---

## Client-Side Pagination (For Small Datasets)

Use this mode when all data is loaded at once and filtered/paginated in the browser.

### Example Implementation

```jsx
import { DataTable } from '@/components/shared/DataTable'

export default function ClientSideExample() {
  const allProducts = [
    // ... all your data loaded at once
  ]

  return (
    <DataTable
      columns={columns}
      allData={allProducts}
      defaultItemsPerPage={10}
    />
  )
}
```

### Props for Client-Side Mode

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `columns` | `array` | ✅ Yes | Column definitions |
| `allData` | `array` | ✅ Yes | All data to display |
| `defaultItemsPerPage` | `number` | ❌ No | Default: `10` |

---

## Features

### ✅ Implemented Features

1. **URL Synchronization**
   - Page and limit are stored in URL query params
   - Supports browser back/forward navigation
   - Direct navigation via URL (e.g., `?page=3&limit=20`)

2. **Pagination Controls**
   - Previous/Next buttons (auto-disabled on first/last page)
   - Page number buttons with ellipsis
   - Shows current page and total pages
   - Smart page number display (shows ±2 pages around current)

3. **Items Per Page Selector**
   - Options: 10, 20, 50, 100
   - Resets to page 1 when changed

4. **Data Range Display**
   - Shows: "Показано 1-10 из 150"
   - Updates dynamically

5. **Edge Cases Handled**
   - Empty results (total = 0)
   - Single page (total ≤ limit)
   - Auto-redirect to page 1 if current page exceeds total pages

6. **Search (Client-Side Only)**
   - Global search across all columns
   - Disabled in server-side mode

---

## API Integration Example

### API Client Function

```javascript
// src/lib/api-services.js
export async function getProducts(params = {}) {
  const { page = 1, limit = 10, search, category_id } = params

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (search) queryParams.append('search', search)
  if (category_id) queryParams.append('category_id', category_id)

  const response = await fetch(
    `https://q-bit.uz/api/products?${queryParams.toString()}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }

  return response.json() // Returns { data, total, page, limit }
}
```

---

## Filters Integration (Server-Side)

When using filters with server-side pagination, reset to page 1 when filters change:

```jsx
const [searchQuery, setSearchQuery] = useState('')
const [selectedCategory, setSelectedCategory] = useState('all')

// Reset to page 1 when filters change
useEffect(() => {
  const timer = setTimeout(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, 500) // Debounce search

  return () => clearTimeout(timer)
}, [searchQuery, selectedCategory])

// Load data when pagination or filters change
useEffect(() => {
  const loadData = async () => {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
    }

    if (searchQuery) params.search = searchQuery
    if (selectedCategory !== 'all') params.category_id = selectedCategory

    const response = await getProducts(params)
    setProducts(response.data)
    setPagination(prev => ({ ...prev, total: response.total }))
  }

  loadData()
}, [pagination.page, pagination.limit, searchQuery, selectedCategory])
```

---

## Migration from Old DataTable

### Before (Client-Side Only)
```jsx
<DataTable
  columns={columns}
  allData={products}
  defaultItemsPerPage={10}
  totalData={products.length}
/>
```

### After (Server-Side)
```jsx
<DataTable
  columns={columns}
  allData={products}              // Only current page data
  defaultItemsPerPage={10}
  totalData={pagination.total}     // Total from API
  serverSide={true}                // Enable server-side mode
  onPageChange={handlePageChange}  // Page change handler
  onLimitChange={handleLimitChange}// Limit change handler
/>
```

---

## Troubleshooting

### Issue: Pagination shows wrong total
**Solution:** Ensure `totalData` prop receives the `total` field from API response, not the length of the current page data.

### Issue: Page changes but data doesn't update
**Solution:** Make sure your `useEffect` dependencies include `pagination.page` and `pagination.limit`.

### Issue: Filter changes don't reset to page 1
**Solution:** Add a `useEffect` that resets pagination when filters change (see Filters Integration example above).

### Issue: URL doesn't update when changing pages
**Solution:** The DataTable now handles URL updates automatically. Make sure you're using Next.js App Router and the component is marked as `"use client"`.

---

## Best Practices

1. **Use Server-Side Pagination for:**
   - Large datasets (>100 items)
   - Data that requires API filtering/sorting
   - Real-time data that changes frequently

2. **Use Client-Side Pagination for:**
   - Small datasets (<100 items)
   - Static data that doesn't change
   - When you need instant search without API calls

3. **Always Handle Loading States:**
   ```jsx
   {loading ? (
     <Loader2 className="h-8 w-8 animate-spin" />
   ) : (
     <DataTable {...props} />
   )}
   ```

4. **Reset to Page 1 When:**
   - Filters change
   - Search query changes
   - Items per page changes

5. **Preserve URL State:**
   - The component automatically syncs with URL params
   - Use `useSearchParams()` to read initial state from URL

---

## Example: Complete Server-Side Implementation

See [src/app/dashboard/products/page.jsx](src/app/dashboard/products/page.jsx) for a complete working example with:
- Server-side pagination
- Search functionality
- Category filtering
- Loading states
- Error handling
