# BCT Product Management Dashboard - API Integration Guide

This document provides comprehensive documentation for the Product Management Dashboard integrated with the BCT e-commerce backend API.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Services](#api-services)
4. [Features](#features)
5. [Usage Guide](#usage-guide)
6. [File Structure](#file-structure)
7. [API Endpoints](#api-endpoints)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Product Management Dashboard is a comprehensive admin panel for managing products, categories, and file uploads. It integrates seamlessly with the BCT backend API at `https://q-bit.uz`.

### Key Technologies

- **Next.js 15** - React framework
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Sonner** - Toast notifications
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components

---

## Authentication

### How Authentication Works

This application uses an **AuthGate modal** for authentication management:

1. User navigates to any dashboard route (e.g., `/dashboard/products`)
2. **AuthGate** component checks authentication status from cookies
3. If not authenticated, **LoginDialog modal** appears automatically
4. User logs in through the modal (credentials handled by your backend)
5. Authentication tokens are stored in cookies (`accessToken`, `authData`)
6. API requests automatically include the token from cookies
7. On token expiry, the modal re-appears for re-authentication

### AuthProvider & AuthGate

Location:
- [src/components/providers/AuthProvider.jsx](./src/components/providers/AuthProvider.jsx)
- [src/components/providers/AuthGate.jsx](./src/components/providers/AuthGate.jsx)

**How it works:**
```jsx
// Wrap your app with AuthProvider
<AuthProvider>
  {/* AuthGate shows LoginDialog when not authenticated */}
  <AuthGate>
    <YourDashboardContent />
  </AuthGate>
</AuthProvider>
```

The `AuthProvider` manages:
- User state
- Access & refresh tokens
- Cookie polling for auth changes
- Authentication status

The `AuthGate` renders:
- Loading state while checking auth
- LoginDialog modal if not authenticated
- Your content if authenticated

---

## API Services

### API Client

Location: [src/lib/api-client.js](./src/lib/api-client.js)

The API client automatically:
- Retrieves tokens from cookies (set by AuthProvider)
- Attaches JWT tokens to requests
- Handles 401 errors
- Manages response parsing
- Provides convenient HTTP methods

**Token Retrieval:**
The API client reads tokens from your cookies:
- First checks for `accessToken` cookie
- Falls back to `authData` cookie and extracts token
- Automatically attaches to `Authorization: Bearer <token>` header

```javascript
import apiClient from '@/lib/api-client'

// GET request (auth token added automatically)
const data = await apiClient.get('/products')

// POST request
const result = await apiClient.post('/products', productData)

// PUT request
await apiClient.put('/products/123', updatedData)

// DELETE request
await apiClient.delete('/products/123')

// File upload
await apiClient.upload('/files/upload-multiple', formData)
```

### Service Modules

Location: [src/lib/api-services.js](./src/lib/api-services.js)

#### Product Service

```javascript
import { productService } from '@/lib/api-services'

// Get all products (with pagination, search, filters)
const response = await productService.getAll({
  page: 1,
  limit: 10,
  search: 'laptop',
  category_id: 5
})

// Get single product
const product = await productService.getById(123)

// Create product
const newProduct = await productService.create({
  name: 'MacBook Pro',
  category_id: 5,
  warranty: '2 года',
  price: 15000000,
  description: 'Latest MacBook Pro',
  params: 'M3 chip, 16GB RAM',
  images: ['/uploads/image1.jpg', '/uploads/image2.jpg']
})

// Update product
await productService.update(123, updatedData)

// Delete product
await productService.delete(123)
```

#### Category Service

```javascript
import { categoryService } from '@/lib/api-services'

// Get all categories
const categories = await categoryService.getAll({ limit: 100 })

// Get single category
const category = await categoryService.getById(5)

// Create category
await categoryService.create({ name: 'Laptops', top_category_id: 1 })

// Update category
await categoryService.update(5, { name: 'Updated Name' })

// Delete category
await categoryService.delete(5)
```

#### File Upload Service

```javascript
import { fileService } from '@/lib/api-services'

// Upload single file
const file = document.querySelector('input[type="file"]').files[0]
const result = await fileService.uploadSingle(file)
// Returns: { url: '/uploads/filename.jpg', filename: '...', size: ... }

// Upload multiple files
const files = Array.from(document.querySelector('input[type="file"]').files)
const result = await fileService.uploadMultiple(files)
// Returns: { files: [...], count: 3 }

// Get full URL
const fullUrl = fileService.getFileUrl('/uploads/image.jpg')
// Returns: 'https://q-bit.uz/uploads/image.jpg'
```

---

## Features

### 1. Product List Page

**Location:** [src/app/dashboard/products/page.jsx](./src/app/dashboard/products/page.jsx)

**Features:**
- Real-time product listing from API
- Search functionality (searches across product names)
- Category filter dropdown
- Pagination (10 items per page)
- Loading states
- Error handling
- Add new product button
- **AuthGate protection** - shows login modal if not authenticated

**How to Use:**
1. Navigate to `/dashboard/products`
2. If not logged in, LoginDialog modal will appear
3. After login, use search bar to find products by name
4. Filter by category using dropdown
5. Click product row to view details
6. Click "Add Product" to create new product

### 2. Add Product Page

**Location:** [src/app/dashboard/products/add/page.jsx](./src/app/dashboard/products/add/page.jsx)

**Features:**
- Form with validation
- Category selection (loaded from API)
- Warranty selection
- Image upload (up to 10 images)
- Real-time image upload to server
- Price input
- Description and technical specifications
- Success/error notifications
- **AuthGate protection**

**How to Use:**
1. Navigate to `/dashboard/products/add`
2. AuthGate ensures you're logged in
3. Fill in product name (required)
4. Select category from dropdown (required)
5. Select warranty period (required)
6. Enter price (required)
7. Add description and technical specs (optional)
8. Upload product images (at least 1 required)
9. Click "Save" to create product

### 3. Product Detail/Edit Page

**Location:** [src/app/dashboard/products/[id]/page.jsx](./src/app/dashboard/products/[id]/page.jsx)

**Features:**
- View product details (read-only mode)
- Edit product information
- Delete product with confirmation
- Real-time data fetching
- Loading states
- Image gallery
- **AuthGate protection**

**How to Use:**

**View Mode:**
1. Navigate to `/dashboard/products/123`
2. AuthGate ensures authentication
3. View all product details
4. Click "Edit" button to switch to edit mode
5. Click "Delete" to remove product (with confirmation)

**Edit Mode:**
1. Navigate to `/dashboard/products/123?type=edit`
2. Modify any field
3. Add/remove images
4. Click "Update" to save changes

### 4. Image Upload Component

**Location:** [src/components/shared/AddImages.jsx](./src/components/shared/AddImages.jsx)

**Features:**
- Drag-and-drop interface
- Multiple file upload
- Real-time upload to server
- File type validation (JPG, PNG, GIF, WEBP, SVG)
- File size validation (max 50MB)
- Image preview
- Remove uploaded images
- First image marked as primary
- Loading indicators

**Supported Formats:**
- JPEG/JPG
- PNG
- GIF
- WEBP
- SVG

---

## Usage Guide

### Complete Workflow Example

#### 1. Access Dashboard

```javascript
// User navigates to /dashboard/products
// AuthGate checks authentication
// If not authenticated, LoginDialog modal appears
// User logs in through modal
// Dashboard content becomes accessible
```

#### 2. Create a New Product

```javascript
// Navigate to /dashboard/products/add
// AuthGate ensures user is logged in
// Fill form:
{
  name: "MacBook Pro 16",
  category_id: 5, // Laptops
  warranty: "2 года",
  price: 18000000,
  description: "Latest MacBook Pro with M3 chip",
  params: "- M3 Pro chip\n- 16GB RAM\n- 512GB SSD"
}

// Upload images (minimum 1)
// Click Save
// Product created and redirected to /dashboard/products
```

#### 3. Search and Filter Products

```javascript
// Navigate to /dashboard/products
// Type "MacBook" in search bar
// Select "Laptops" from category filter
// View filtered results
```

#### 4. Edit Product

```javascript
// Click on product row
// Click "Edit" button
// Modify price: 18000000 → 17500000
// Add new image
// Click "Update"
// Product updated successfully
```

#### 5. Delete Product

```javascript
// Click on product row
// Click "Delete" button
// Confirm deletion in dialog
// Product removed from database
```

---

## File Structure

```
src/
├── app/
│   └── dashboard/
│       └── products/
│           ├── page.jsx               # Products list page
│           ├── add/
│           │   └── page.jsx           # Add product page
│           └── [id]/
│               └── page.jsx           # Product detail/edit page
├── components/
│   ├── forms/
│   │   └── ProductForm.jsx            # Reusable product form
│   ├── shared/
│   │   └── AddImages.jsx              # Image upload component
│   └── providers/
│       ├── AuthProvider.jsx           # Authentication state management
│       └── AuthGate.jsx               # Auth protection component
├── lib/
│   ├── api-client.js                  # API client (reads tokens from cookies)
│   └── api-services.js                # Product, category, file services
└── middleware.js                      # Simple routing (no auth redirect)
```

---

## API Endpoints

### Base URL
```
https://q-bit.uz/api
```

### Authentication

Authentication is handled by your backend via the LoginDialog modal. The API client automatically includes tokens from cookies.

### Products

#### List Products
```http
GET /products?page=1&limit=10&search=laptop&category_id=5
Authorization: Bearer <token>

Response:
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

#### Get Product
```http
GET /products/123
Authorization: Bearer <token>

Response:
{
  "data": {
    "id": 123,
    "name": "MacBook Pro",
    "category_id": 5,
    "category": { "id": 5, "name": "Laptops" },
    "warranty": "2 года",
    "price": 18000000,
    "description": "...",
    "params": "...",
    "images": ["/uploads/img1.jpg", "/uploads/img2.jpg"]
  }
}
```

#### Create Product
```http
POST /products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "MacBook Pro",
  "category_id": 5,
  "warranty": "2 года",
  "price": 18000000,
  "description": "Latest MacBook",
  "params": "M3 chip, 16GB RAM",
  "images": ["/uploads/img1.jpg"]
}
```

#### Update Product
```http
PUT /products/123
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "price": 17500000
}
```

#### Delete Product
```http
DELETE /products/123
Authorization: Bearer <token>
```

### Categories

#### List Categories
```http
GET /categories?limit=100
Authorization: Bearer <token>
```

#### Get Category
```http
GET /categories/5
Authorization: Bearer <token>
```

### File Upload

#### Upload Multiple Files
```http
POST /files/upload-multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  files: [File, File, ...]

Response:
{
  "files": [
    {
      "url": "/uploads/filename1.jpg",
      "filename": "filename1.jpg",
      "size": 123456
    }
  ],
  "count": 2
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Unauthorized - please login again"

**Cause:** Token expired or invalid

**Solution:**
- The LoginDialog modal should appear automatically
- Re-authenticate through the modal
- If modal doesn't appear, check browser console for errors

#### 2. Image upload fails

**Causes:**
- File type not supported
- File size exceeds 50MB
- No authentication token

**Solution:**
- Check file format (must be JPG, PNG, GIF, WEBP, SVG)
- Reduce file size
- Ensure token is in cookies (check Application tab in DevTools)

#### 3. Categories not loading

**Cause:** API connection issue

**Solution:**
- Check network connection
- Verify API is running at https://q-bit.uz
- Check browser console for errors

#### 4. Products not displaying

**Causes:**
- Empty database
- API connection issue
- Filter too restrictive

**Solution:**
- Check if products exist in database
- Clear search and category filters
- Check browser console for errors

#### 5. LoginDialog not appearing

**Cause:** AuthGate not wrapping component

**Solution:**
- Ensure your dashboard pages are wrapped with AuthGate
- Check that AuthProvider is in the root layout
- Verify cookie polling is working

### Debug Mode

Enable debug logging:

```javascript
// In api-client.js, add:
console.log('Request:', endpoint, options)
console.log('Response:', data)
console.log('Token:', getTokenFromCookies())
```

### Network Inspection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Check request/response for errors
5. Verify Authorization header is present
6. Check Application → Cookies for `accessToken` or `authData`

---

## Environment Variables

If needed, you can configure the API base URL:

```env
# .env.local
NEXT_PUBLIC_API_URL=https://q-bit.uz/api
```

Then update [api-client.js](./src/lib/api-client.js):

```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://q-bit.uz/api'
```

---

## Additional Features

### Planned Features

- [ ] Bulk product import/export
- [ ] Advanced search with filters
- [ ] Product variants support
- [ ] Inventory management
- [ ] Order integration
- [ ] Analytics dashboard
- [ ] Multi-language support for product data

### Customization

To customize the product form fields, edit:
- [src/components/forms/ProductForm.jsx](./src/components/forms/ProductForm.jsx)

To add new API endpoints, edit:
- [src/lib/api-services.js](./src/lib/api-services.js)

To modify authentication behavior, edit:
- [src/components/providers/AuthProvider.jsx](./src/components/providers/AuthProvider.jsx)
- [src/components/providers/AuthGate.jsx](./src/components/providers/AuthGate.jsx)

---

## Support

For issues or questions:
1. Check this documentation
2. Review browser console errors
3. Check network requests in DevTools
4. Verify API endpoint responses
5. Check cookies in Application tab

---

## License

BCT ERP System v1.0 - Proprietary Software

---

## Changelog

### v1.0.1 (2025-10-23)
- Updated to use AuthGate modal authentication
- Removed standalone login page
- API client now reads tokens from cookies (AuthProvider)
- No page redirects - all auth handled via modal

### v1.0.0 (2025-10-23)
- Initial release
- Product CRUD operations
- Category management
- Image upload functionality
- Search and filter capabilities
- Comprehensive error handling
