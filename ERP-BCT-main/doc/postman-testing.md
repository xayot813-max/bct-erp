# Postman Testing Guide

This guide describes how to exercise every REST endpoint exposed by the Fiber API with Postman. It assumes the application runs locally at `http://localhost:3000`.

## 1. Environment Setup
- Create a Postman environment with the following variables:
  - `baseUrl` = `http://localhost:3000`
  - `apiPrefix` = `{{baseUrl}}/api`
  - `adminToken` = _(fill after admin login)_
  - `userToken` = _(fill after user login)_
- Add a collection-level header:
  - `Content-Type: application/json`
- For secured requests add `Authorization: Bearer {{adminToken}}` (admin models) or `Authorization: Bearer {{userToken}}` (user profile endpoints).

## 2. Authentication

### 2.1 Admin Authentication (`/api/admin`)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `{{apiPrefix}}/admin/login` | Body: `{ "name": "admin", "password": "bct123" }`. Stores `token` in response. |
| PUT | `{{apiPrefix}}/admin/update` | Requires `Authorization`. Body: `{ "name": "admin", "password": "newPassword" }`. Refresh `adminToken` from response. |
| GET | `{{apiPrefix}}/admin/profile` | Requires `Authorization`. |
| GET | `{{apiPrefix}}/admin/debug` | Diagnostics, no auth required. Useful for verifying a seeded admin. |

**Save Token:** after login/update copy the `token` field to `adminToken`.

### 2.2 User Authentication (`/api/auth`)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `{{apiPrefix}}/auth/register` | Sample body:<br>`{ "name": "John Doe", "email": "john@example.com", "phone": "+998901112233", "password": "Secret123" }` |
| POST | `{{apiPrefix}}/auth/login` | Body: `{ "phone": "+998901112233", "password": "Secret123" }` |
| GET | `{{apiPrefix}}/auth/profile` | Requires `Authorization: Bearer {{userToken}}`. |
| PUT | `{{apiPrefix}}/auth/profile` | Requires token. Body can include `name`, `email`, `phone`, `password`. |

**Save Token:** copy the `token` value from login response into `userToken` (if JWT issuance is restored).

## 3. Admin Dashboard (`/api/admin/dashboard`, admin token required)
| Method | Path | Query | Description |
| --- | --- | --- | --- |
| GET | `/stats` | none | Aggregate counts for users, orders, products, reviews. |
| GET | `/recent-activities` | `limit` (default 20) | Combined feed of recent users, orders, and reviews. |
| GET | `/sales-analytics` | `period=day|week|month|year` | Total orders and revenue grouped by period. |
| GET | `/top-products` | `limit` (default 10) | Most sold products by order count. |
| GET | `/user-growth` | `period` | New users grouped by period. |
| GET | `/alerts` | none | Operational alerts (pending orders, inactive users, etc.). |

## 4. File Uploads (`/api/files`)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/upload` | Form-data with key `file`. Accepts images up to 50 MB. |
| POST | `/upload-multiple` | Multipart with key `files` (array). Total payload ≤ 50 MB. |

## 5. CRM Entities (admin token recommended)

### 5.1 Companies (`/api/companies`)
| Method | Path | Body |
| --- | --- | --- |
| GET | `/` | Optional query: `page`, `limit`. |
| GET | `/{id}` | — |
| POST | `/` | `{ "name": "ACME", "email": "info@acme.com", "inn": "123456789", "address": "Tashkent, UZ", "phone": "+998901234567", "comment": "Preferred client" }` |
| PUT | `/{id}` | Any subset of fields. Numeric fields (`order_count`, `total_amount`) accept string or number. |
| DELETE | `/{id}` | — |

### 5.2 Clients (`/api/clients`)
| Method | Path | Body |
| --- | --- | --- |
| GET | `/` | Supports `page`, `limit`. |
| GET | `/{id}` | — |
| POST | `/` | `{ "first_name": "Ali", "last_name": "Karimov", "email": "ali@client.com", "phone": "+998909876543", "company_phone": "+998901234567", "company": "ACME", "address": "Yunusabad", "comment": "VIP" }` |
| PUT | `/{id}` | Update any field; system updates `updated_at`. |
| DELETE | `/{id}` | — |

### 5.3 Counterparties (`/api/counterparties`)
Same contract as clients. Replace path with `/counterparties`.

### 5.4 Contracts (`/api/contracts`)
| Method | Path | Body |
| --- | --- | --- |
| GET | `/` | Optional `client_id`, `company_id`, `page`, `limit`. |
| GET | `/{id}` | — |
| POST | `/` | ```json
{
  "client_id": "64f0c9b9c7c84f1cf3359f5c",
  "counterparty_id": "64f0c9b9c7c84f1cf3359f5d",
  "company_id": "64f0c9b9c7c84f1cf3359f5e",
  "guarantee": "12 months",
  "comment": "First deal",
  "deal_date": "2024-09-01T00:00:00Z",
  "contract_amount": 125000000,
  "contract_currency": "UZS",
  "pay_card": 75000000,
  "pay_cash": 50000000,
  "products": [
    {
      "product_id": "64f0c9b9c7c84f1cf3359f60",
      "price": 25000000,
      "quantity": 2,
      "discount": 5000000,
      "serial_number": "SN-123",
      "shtrix_number": "SH-123"
    }
  ]
}
``` |
| PUT | `/{id}` | Same shape as POST (provide full contract object). |
| DELETE | `/{id}` | — |

### 5.5 Funnels (`/api/funnels`)
| Method | Path | Body |
| --- | --- | --- |
| GET | `/` | Returns ordered list of stages. |
| GET | `/{id}` | — |
| POST | `/` | `{ "name": "Negotiation", "color": "#FF9500", "comment": "Pricing stage", "order": 2 }` |
| PUT | `/{id}` | Update any field (order must be numeric). |
| DELETE | `/{id}` | — |

## 6. Catalog & Content

### 6.1 Top Categories (`/api/top-categories`)
| Method | Path | Body |
| --- | --- | --- |
| GET | `/` | Query: `page`, `limit`. |
| GET | `/{id}` | — |
| POST | `/` | `{ "name": "Equipment", "image": "/uploads/topcat.png" }` |
| PUT | `/{id}` | Update subset. |
| DELETE | `/{id}` | — |

### 6.2 Categories (`/api/categories`)
| Method | Path | Body |
| --- | --- | --- |
| GET | `/` | Supports filter `top_category_id`, pagination. |
| GET | `/{id}` | — |
| POST | `/` | `{ "name": "Scanners", "image": "/uploads/scanners.png", "top_category_id": "64f0c9..." }` |
| PUT | `/{id}` | Accepts field updates. |
| DELETE | `/{id}` | — |

### 6.3 Products (`/api/products`)
| Method | Path | Body |
| --- | --- | --- |
| GET | `/` | Query filters: `page`, `limit`, `category_id`, `top_category_id`, `search`. |
| GET | `/{id}` | — |
| POST | `/` | ```json
{
  "name": "Barcode Scanner X1",
  "ads_title": "High-speed scanner",
  "images": ["/uploads/x1.png"],
  "description": "Industrial-grade barcode scanner.",
  "guarantee": "24 months",
  "serial_number": "SCN-X1-001",
  "shtrix_number": "1234567890123",
  "price": 1499000,
  "discount": 100000,
  "category_id": "64f0c9...",
  "top_category_id": "64f0c9...",
  "count": 100,
  "NDC": 200000,
  "tax": 150000
}
``` |
| PUT | `/{id}` | Provide fields to update; numeric fields can be numbers or strings. |
| DELETE | `/{id}` | — |
| GET | `/by-top-category/{top_category_id}` | Filter by top category. |
| GET | `/discounted` | Lists products where `discount` is present. |

### 6.4 Orders (`/api/orders`)
| Method | Path | Body |
| --- | --- | --- |
| GET | `/` | Query: `page`, `limit`, `client_id`. |
| GET | `/{id}` | — |
| POST | `/` | ```json
{
  "phone": "+998901112233",
  "pay_type": "card",
  "products": [
    {
      "product_id": "64f0c9...",
      "count": 2
    }
  ],
  "client_id": "64f0c9..."
}
``` |
| PUT | `/{id}` | Update order fields (status, products, etc.). |
| DELETE | `/{id}` | — |

### 6.5 Informational Singletons
| Group | Base Path | Notes |
| --- | --- | --- |
| About | `/api/about` | GET returns singleton, POST creates, PUT updates, DELETE removes. |
| Links | `/api/links` | Same pattern as About. |
| Discount | `/api/discount` | Contains single discount configuration. |
| Official Partner | `/api/official-partner` | Singleton record. |

### 6.6 Media & Content Collections
These collections share CRUD behavior (via `genericCRUD`). Use standard Create/Read/Update/Delete calls with payloads matching the model.

| Collection | Base Path |
| --- | --- |
| Vendors | `/api/vendors` |
| Projects | `/api/projects` |
| Vendors About | `/api/vendors-about` |
| Experiments | `/api/experiments` |
| Company Stats | `/api/company-stats` |
| Reviews | `/api/reviews` |
| Sercificates | `/api/sertificates` |
| Licenses | `/api/licenses` |
| News | `/api/news` |
| Partners | `/api/partners` |
| Admins (management) | `/api/admins` |
| Currency | `/api/currency` |
| Banners | `/api/banners` |
| Select Reviews | `/api/select-reviews` |
| Backgrounds | `/api/backgrounds` |
| Contacts | `/api/contacts` |
| Banner Sort | `/api/banner-sorts` |
| Top Category Sort | `/api/top-category-sorts` |
| Category Sort | `/api/category-sorts` |

**Sample POST Body (Generic CRUD):**
```json
{
  "name": "Sample Record",
  "image": "/uploads/sample.png",
  "description": "Optional fields vary by model."
}
```

For `currency` use `{ "sum": "12000" }`. For `contacts` include the full contact sheet fields from `models.Contacts`.

## 7. Testing Workflow
1. **Bootstrap data** – Use admin login, then create top categories, categories, and products.
2. **CRM Flow** – Create companies, clients, counterparties, and contracts. Verify list/detail endpoints.
3. **Order Lifecycle** – Create orders, then update status or items. Confirm dashboards reflect changes.
4. **Content Management** – Exercise each content collection (reviews, news, banners, etc.).
5. **File Handling** – Upload single and multiple files; use returned URLs in product or content payloads.
6. **Dashboard Checks** – Call stats/analytics endpoints after data seeding to ensure aggregates update.

## 8. Postman Tips
- Use Postman folders to mirror the sections above.
- Configure `Tests` tab to store tokens automatically, e.g.:
  ```js
  const json = pm.response.json();
  if (json.token) {
    pm.environment.set("adminToken", json.token);
  }
  ```
- Attach sample responses as examples in Postman to speed regression verification.
- For numeric fields that accept strings (e.g., `total_amount`, `price`) verify both input formats.

With this structure the full API surface defined in the Fiber project can be validated quickly across deployments using Postman. Adjust request bodies to match your seed data or production fixtures.***
