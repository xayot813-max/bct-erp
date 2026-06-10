# Quick Start Guide - BCT Product Management Dashboard

## 🚀 Getting Started in 5 Minutes

### 1. Access Dashboard

1. Navigate to: `http://localhost:3000/dashboard/products`
2. **AuthGate** checks if you're authenticated
3. If not logged in, **LoginDialog modal** appears automatically
4. Enter your credentials in the modal
5. After login, you can access all product features

### 2. View Products

- Products are automatically loaded from API
- Use the search bar to find products
- Use category dropdown to filter
- Click on any product to view details

### 3. Add a Product

1. Click "Add Product" button
2. Fill in the form:
   - **Name:** (required) e.g., "MacBook Pro 16"
   - **Category:** (required) Select from dropdown
   - **Warranty:** (required) e.g., "2 года"
   - **Price:** (required) e.g., 18000000
   - **Description:** (optional)
   - **Technical Specs:** (optional)
3. Upload at least 1 image (up to 10)
4. Click "Save"

### 4. Edit a Product

1. Click on any product in the list
2. Click "Edit" button
3. Modify fields as needed
4. Click "Update"

### 5. Delete a Product

1. Click on any product in the list
2. Click "Delete" button
3. Confirm deletion

---

## 🔐 Authentication

### How It Works

- **No login/register pages** - authentication is handled via a **modal**
- **AuthGate** component wraps dashboard routes
- If not authenticated, **LoginDialog modal** appears automatically
- Credentials handled by your backend
- Tokens stored in cookies (`accessToken`, `authData`)
- On token expiry, modal re-appears for re-authentication

### AuthGate Components

**AuthProvider** ([src/components/providers/AuthProvider.jsx](./src/components/providers/AuthProvider.jsx)):
- Manages authentication state
- Polls cookies for token changes
- Provides user and token context

**AuthGate** ([src/components/providers/AuthGate.jsx](./src/components/providers/AuthGate.jsx)):
- Shows loading state while checking auth
- Shows LoginDialog modal if not authenticated
- Shows your content if authenticated

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/lib/api-client.js` | API client - reads tokens from cookies |
| `src/lib/api-services.js` | Product/category services |
| `src/components/forms/ProductForm.jsx` | Product form component |
| `src/components/shared/AddImages.jsx` | Image upload component |
| `src/app/dashboard/products/page.jsx` | Products list page |
| `src/components/providers/AuthProvider.jsx` | Auth state management |
| `src/components/providers/AuthGate.jsx` | Auth protection modal |
| `src/middleware.js` | Simple routing (no auth redirect) |

---

## 🔑 API Configuration

**Backend API:** `https://q-bit.uz/api`

**Token Storage:**
- Cookie: `accessToken` (primary)
- Cookie: `authData` (contains user + token, fallback)

**Authentication Flow:**
1. User navigates to dashboard
2. AuthGate checks `accessToken` cookie
3. If missing, shows LoginDialog modal
4. User logs in via modal
5. Backend sets cookies
6. AuthProvider detects new cookies
7. API requests automatically include token

---

## 🛠️ Common Tasks

### Access Products API

```javascript
import { productService } from '@/lib/api-services'

// Get products (token added automatically from cookies)
const products = await productService.getAll({ page: 1, limit: 10 })

// Create product
await productService.create({
  name: 'Product Name',
  category_id: 5,
  warranty: '2 года',
  price: 1000000,
  images: ['/uploads/image.jpg']
})
```

### Upload Images

```javascript
import { fileService } from '@/lib/api-services'

const files = [file1, file2]
const result = await fileService.uploadMultiple(files)
// Returns: { files: [...], count: 2 }
```

### Check Authentication Status

```javascript
import { useAuth } from '@/components/providers/AuthProvider'

function MyComponent() {
  const { isAuthenticated, user, tokens } = useAuth()

  if (isAuthenticated) {
    console.log('User:', user)
    console.log('Access Token:', tokens.accessToken)
  }
}
```

---

## 🐛 Troubleshooting

### Issue: LoginDialog modal not appearing
**Solution:**
- Check that AuthProvider wraps your app
- Check that AuthGate wraps dashboard pages
- Verify cookies in Application tab

### Issue: Can't login
**Solution:**
- Check network tab for API errors
- Verify backend is running
- Check cookie settings in browser

### Issue: Images not uploading
**Solution:**
- Check file format (JPG, PNG, GIF, WEBP, SVG only)
- Check file size (max 50MB)
- Ensure authenticated (check cookies)

### Issue: Products not loading
**Solution:**
- Check if authenticated
- Check browser console for errors
- Verify API is accessible at https://q-bit.uz

### Issue: "Unauthorized" errors
**Solution:**
- LoginDialog modal should appear automatically
- Re-authenticate through modal
- Check `accessToken` cookie exists

---

## 📚 Full Documentation

For complete documentation, see [PRODUCT_DASHBOARD_README.md](./PRODUCT_DASHBOARD_README.md)

---

## 🎯 Workflow Summary

```
1. User navigates to /dashboard/products
     ↓
2. AuthGate checks authentication (cookies)
     ↓
3a. If authenticated → Show dashboard
3b. If not → Show LoginDialog modal
     ↓
4. User logs in via modal
     ↓
5. Backend sets cookies (accessToken, authData)
     ↓
6. AuthProvider detects cookies
     ↓
7. Dashboard content accessible
     ↓
8. API requests include token automatically
```

---

## 💡 Tips

- **Authentication is modal-based** - no login page needed
- **First image** uploaded becomes the primary product image
- **Search** is debounced (500ms delay)
- **Token** handled automatically from cookies
- **Middleware** doesn't redirect - just routes to dashboard
- **Toast notifications** show success/error messages
- **AuthGate** handles all authentication UI

---

## 🔐 Security Notes

- All API requests include JWT token from cookies
- Token retrieved automatically by api-client
- AuthGate protects dashboard routes (shows modal if needed)
- No manual token management required
- Cookies managed by your backend & AuthProvider

---

## 📞 Support

- Read full documentation: `PRODUCT_DASHBOARD_README.md`
- Check browser console for errors
- Review network requests in DevTools
- Verify cookies in Application tab
- Check that AuthProvider wraps your app

---

## 🚦 Next Steps

1. ✅ Navigate to `/dashboard/products`
2. ✅ Login via modal (if needed)
3. ✅ Browse products
4. ✅ Create a test product
5. ✅ Upload product images
6. ✅ Edit product details
7. ✅ Test search and filters
8. ✅ Review documentation

---

**BCT ERP System v1.0.1** - Product Management Dashboard with AuthGate
