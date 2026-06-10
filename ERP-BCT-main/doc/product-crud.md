# Product CRUD Implementation Guide

This document explains how to recreate the product Create/Read/Update/Delete workflow from the `bct-admin` project inside another codebase that might not yet contain the same helper functions. Use it as a blueprint to port the logic or to rebuild the missing utilities.

---

## 1. Data Model Expectations

The product form works with multilingual fields, table-style descriptions, and standard scalar values. A minimal product object supplied by your UI should resemble:

```js
const product = {
  name: { en: "Laptop", ru: "Ноутбук", uz: "Noutbuk" },
  ads_title: "Powerful laptop",              // string or multilingual object
  description: { columns: [], rows: [] },    // see Section 3
  guarantee: { en: "12 months" },
  serial_number: "ABC123",
  price: "1200",
  discount: "100",
  category_id: "5",
  image: ["https://cdn.example.com/img.jpg"],
};
```

Everything funnels through a single payload normaliser before the data is sent to the server.

---

## 2. Core Helper Functions to Rebuild

Create a module (e.g. `lib/productCrud.js`) containing the helpers below.

### 2.1 `ensureLanguageObject(value)`
- Accepts `string`, `null`, or `{ en, ru, uz }`.
- Always returns an object with the keys `en`, `ru`, and `uz`.
- Strings are duplicated across languages; `null` yields empty strings.

```js
const PRODUCT_LANGUAGES = ["en", "ru", "uz"];

const ensureLanguageObject = (value) => {
  if (value == null || value === "") {
    return PRODUCT_LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang]: "" }), {});
  }

  if (typeof value === "string") {
    return PRODUCT_LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang]: value.trim() }), {});
  }

  return PRODUCT_LANGUAGES.reduce((acc, lang) => {
    const raw = value[lang];
    acc[lang] = raw == null ? "" : String(raw);
    return acc;
  }, {});
};
```

### 2.2 `formatMultilingualField(value)`
- Converts the object returned by `ensureLanguageObject` into the storage format required by your backend.
- In the original project the format is handled by `MultilingualHelpers.formatMultilingual`, which outputs a `***`-delimited string. Recreate the same conversion or adopt your own.

```js
const formatMultilingualField = (value) => {
  const normalized = ensureLanguageObject(value);
  // Example serializer: "en***Laptop|||ru***Ноутбук|||uz***Noutbuk"
  return Object.entries(normalized)
    .map(([lang, text]) => `${lang}***${text}`)
    .join("|||");
};
```

### 2.3 `normalizeCurrencyValue(value)`
- Guarantees that numeric fields are saved as strings stripped of separators.
- If your project already has a util, reuse it; otherwise implement a simple formatter.

```js
const normalizeCurrencyValue = (value) => {
  if (value == null) return "";
  const numeric = String(value).replace(/[^\d.,-]/g, "").replace(",", ".");
  return numeric;
};
```

### 2.4 `normaliseTableDescription(description)`
- Accepts multiple shapes:
  - Already-serialized JSON string describing the table.
  - `{ columns, rows }` object.
  - Legacy array of rows (`[{ name, description, ... }]`).
  - Plain string fallback.
- Always returns a JSON string shaped as `{ columns, rows }` where column labels and cell values are multilingual strings via `formatMultilingualField`.

Key points:
1. When `description` is falsy → return `JSON.stringify({ columns: [], rows: [] })`.
2. For array input, generate default columns `["name", "description", "parameters", "size"]`.
3. For object input, ensure each column has an `id` and each value is normalised.

```js
const EMPTY_DESCRIPTION_STRUCTURE = JSON.stringify({ columns: [], rows: [] });

const normaliseTableDescription = (description) => {
  if (!description) return EMPTY_DESCRIPTION_STRUCTURE;

  if (typeof description === "string") {
    try {
      const parsed = JSON.parse(description);
      if (parsed && typeof parsed === "object") {
        return JSON.stringify(parsed);
      }
      return description; // already formatted string
    } catch {
      return description;
    }
  }

  if (Array.isArray(description)) {
    const defaultColumns = ["name", "description", "parameters", "size"].map((key, idx) => ({
      id: `col_${idx}`,
      label: formatMultilingualField({
        en: key.charAt(0).toUpperCase() + key.slice(1),
        ru: "",
        uz: "",
      }),
    }));

    const rows = description.map((row) =>
      defaultColumns.reduce((acc, column, idx) => {
        const rawValue = row?.[["name", "description", "parameters", "size"][idx]] ?? "";
        acc[column.id] = formatMultilingualField(rawValue);
        return acc;
      }, {})
    );

    return JSON.stringify({ columns: defaultColumns, rows });
  }

  if (typeof description === "object") {
    const columns = (description.columns || []).map((column, idx) => ({
      id: column?.id || `col_${idx}`,
      label: formatMultilingualField(column?.label ?? ""),
    }));

    const rows = (description.rows || []).map((row = {}) => {
      const formattedRow = {};
      Object.entries(row).forEach(([colId, cellValue]) => {
        formattedRow[colId] = formatMultilingualField(cellValue);
      });
      return formattedRow;
    });

    return JSON.stringify({ columns, rows });
  }

  return EMPTY_DESCRIPTION_STRUCTURE;
};
```

### 2.5 `stripEmptyFields(payload)`
- Removes empty strings, nulls, or empty arrays before sending the request.

```js
const stripEmptyFields = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value == null) return false;
      if (typeof value === "string") return value.trim() !== "";
      if (Array.isArray(value)) return value.length > 0;
      return true;
    })
  );
```

### 2.6 `buildProductPayload(product = {})`
- Uses all helpers above to produce the final payload.

```js
export const buildProductPayload = (product = {}) => {
  const payload = {
    name: formatMultilingualField(product.name),
    ads_title: formatMultilingualField(product.ads_title),
    description: normaliseTableDescription(product.description),
    guarantee: formatMultilingualField(product.guarantee),
    serial_number: product.serial_number ? String(product.serial_number) : "",
    price: normalizeCurrencyValue(product.price),
    discount: normalizeCurrencyValue(product.discount),
    category_id: product.category_id ? String(product.category_id) : "",
    image: Array.isArray(product.image)
      ? product.image.filter(Boolean)
      : product.image
      ? [product.image]
      : [],
  };

  return stripEmptyFields(payload);
};
```

---

## 3. Description Editing Workflow

When building the UI:

1. Present users with a table editor that manipulates `{ columns, rows }`.
2. Each column should include a stable `id` (e.g. `col_0`) and a multilingual label.
3. Each row is an object where keys match column IDs and values are multilingual strings.
4. Before submitting, pass the structure directly into `buildProductPayload`; the helper will serialise it.
5. When populating the form for editing, parse the stored JSON back into an object and feed it to the editor.

```js
const parsedDescription = JSON.parse(existingProduct.description || "{}");
// Safeguard missing data:
const { columns = [], rows = [] } = parsedDescription;
```

---

## 4. CRUD Integration Layer

Your store or API client should expose `createItem`, `updateItem`, and `deleteItem`. If these functions do not exist:

```js
export const createItem = async (resource, payload) => {
  const response = await fetch(`/api/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create");
  return response.json();
};

export const updateItem = async (resource, id, payload) => {
  const response = await fetch(`/api/${resource}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update");
  return response.json();
};

export const deleteItem = async (resource, id) => {
  const response = await fetch(`/api/${resource}/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete");
  return response.json();
};
```

Then wire them into the CRUD hook:

```js
export function useProductCrud() {
  const addProduct = useCallback((productData) => {
    const payload = buildProductPayload(productData);
    return createItem("products", payload);
  }, []);

  const updateProduct = useCallback((id, productData) => {
    const payload = buildProductPayload(productData);
    return updateItem("products", id, payload);
  }, []);

  const deleteProduct = useCallback((id) => deleteItem("products", id), []);

  return {
    addProduct,
    updateProduct,
    deleteProduct,
    buildProductPayload,
    languages: PRODUCT_LANGUAGES,
  };
}
```

---

## 5. Quick Start Checklist

1. Recreate the helper functions from Section 2 in your project.
2. Ensure multilingual serialization matches your backend’s expectations.
3. Implement the `normaliseTableDescription` logic so the description field stays consistent across imports.
4. Build a CRUD wrapper (`createItem`, `updateItem`, `deleteItem`) that talks to your API.
5. Hook the helpers into your form submission handlers.
6. Test with:
   - Simple product (only English strings).
   - Full multilingual product.
   - Table description with multiple columns/rows.
   - Existing legacy data (array or string descriptions).

Once these steps are complete, your new project will behave the same way as `bct-admin` for adding and editing products, including the rich multilingual description support.

