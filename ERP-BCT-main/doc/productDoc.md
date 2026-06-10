# Product Modal Architecture

This guide explains how product and category add, edit, and delete flows work in the admin panel. It follows the complete path from the UI dialogs to the underlying store actions, including language handling, rich text, and table-style descriptions.

## High-level flow

1. `src/components/AdminDashboard.js` manages the active model (`products`, `categories`, etc.) and opens the correct modal.
2. `src/components/CreateEditForm.js` renders the dynamic form for the selected model, using field metadata from `src/lib/models.js`.
3. `src/lib/store.js` exposes `createItem`, `updateItem`, and `deleteItem`, which perform API calls and revalidation.
4. `src/components/DataTable.js` displays list views, wires edit/delete buttons, and handles the delete confirmation dialog.

## Admin dashboard dialogs

The dashboard keeps local state for dialog visibility and the record being edited:

- `isCreateDialogOpen` toggles the “add new” dialog for non-singleton models.
- `editingItem` holds the row selected for editing; when truthy a second dialog renders below the main card.
- `isSingletonEditOpen` is used for singleton content types (notably not products/categories).

When the active model (`currentModel`) is `products` or `categories`, the `Dialog` from shadcn/ui wraps `CreateEditForm`. The `model` prop is passed through so the form can look up its field configuration. `handleSuccess` closes dialogs and triggers `fetchData` to refresh the table.

## Dynamic form rendering (`CreateEditForm`)

The product and category modals reuse the same form component. Key responsibilities:

### Field metadata

`CreateEditForm` reads `MODELS[model]` from `src/lib/models.js`. The relevant definitions are:

```js
products: {
  fields: [
    { key: "name", type: "multilingual", required: true },
    { key: "ads_title", type: "multilingual" },
    { key: "image", type: "file-multiple" },
    { key: "description", type: "multilingual-table", required: true },
    { key: "guarantee", type: "multilingual" },
    { key: "serial_number", type: "text" },
    { key: "price", type: "text", required: true },
    { key: "discount", type: "text" },
    { key: "category_id", type: "select", options: "categories", required: true },
  ],
  displayFields: [...]
},

categories: {
  fields: [
    { key: "name", type: "multilingual", required: true },
    { key: "image", type: "file" },
  ],
  displayFields: [...]
}
```

The shared form component loops these `fields` and calls `renderField`, so the same modal automatically adapts to products vs. categories.

### Form state

- `initializeFormData` seeds inputs when starting a new record or editing an existing one.
- `formData` stores current values and is reset whenever the `item` prop changes.
- `errors` stores per-field validation messages.
- `uploadedFiles` tracks preview information for file inputs.

### Validation and submission

`validateForm` enforces required fields and, for color pickers, the custom HEX rule. `handleSubmit`:

1. Calls `validateForm`; aborts if errors exist.
2. Clones `formData`, removes `""` values.
3. Chooses `createItem` or `updateItem` from `useStore()` based on whether `item` is provided.
4. On success calls `onSuccess`, which closes dialogs and refreshes table data from the store.

### Select field hydration

`useEffect` detects `select` fields, fetches option lists (e.g., categories for product/category association), and merges the existing selection back into the option array if it is missing.

### Multilingual helpers

The form is wrapped by `FormLanguageProvider` so every multilingual input shares a synchronized “currently editing language”. Relevant components:

- `MultilingualInput`: handles simple text/textarea fields; converts storage format (`english***russian***uzbek`) to language-specific inputs.
- `MultilingualRichTextEditor`: WYSIWYG editor for rich text fields (news articles, detailed descriptions). Uses `document.execCommand` toolbar actions, per-language editing, and syncs values through `MultilingualHelpers`.
- `MultilingualTableInput`: serializes dynamic column/row tables such as the product specifications matrix. It produces JSON matching the format expected by `ProductFeatures` on the storefront (columns with multilingual labels and rows with multilingual cell values).

## Data table integration (`DataTable`)

- Receives `model`, `data`, and `onEdit` from the dashboard.
- `onEdit(item)` is called by the edit button; the dashboard stores `editingItem` and renders the edit dialog.
- The delete button lives inside a shadcn `AlertDialog`. Confirming the dialog calls `handleDelete`, which forwards to `deleteItem(model, id)` from the store.
- `formatFieldValue` handles multilingual display, price formatting, image previews, and truncated text for list view readability.

## Store actions (`src/lib/store.js`)

The Zustand store exposes the same CRUD operations used by product and category modals:

- `createItem(model, data)`: POSTs to `${API_BASE_URL}/${apiRoute}`, posts a revalidation request to `API_REVALIDATE`, then refetches data (singleton vs. collection).
- `updateItem(model, id, data)`: PUTs to `${API_BASE_URL}/${apiRoute}/${id}` and revalidates/fetches as above.
- `deleteItem(model, id)`: DELETEs the record, revalidates, and refetches.
- `fetchData(model)`: Populates `data[model]` with paginated results. Both the modals and the table rely on this for up-to-date lists.
- `getApiRoute(model)` translates friendly model keys (e.g., `"products"`) into API paths when they differ.

All three CRUD actions toggle `loading`, populate `error` on failure, and surface those flags to the UI (error banner, disabled buttons, etc.).

## Category management specifics

Because categories and products share the same pipeline, the only difference is metadata and field components. Categories show up in the same `DataTable`, use identical modals, and route to `/categories` on the API.

When adding or editing a product, the `category_id` `<Select>` is hydrated from `fetchData("categories")`. The select uses `getTranslatedValue` to show the category name in the chosen table/form language.

## Rich text and product descriptions

- `description` uses `MultilingualTableInput`, which stores a JSON string such as:

  ```json
  {
    "columns": [
      { "id": "col_0", "label": "Specs***Характеристики***Texnik ko'rsatkichlar" },
      { "id": "col_1", "label": "Value***Значение***Qiymat" }
    ],
    "rows": [
      {
        "col_0": "Weight***Вес***Vazn",
        "col_1": "2kg***2кг***2kg"
      }
    ]
  }
  ```

- This format is consumed by `src/components/ProductFeatures.js`, which parses the JSON, resolves translations through `getTranslatedValue`, and renders a language-aware table in the storefront and inline admin previews.

- For plain rich text fields (e.g., `ads_title`, `guarantee`), `MultilingualRichTextEditor` produces HTML strings segmented by language. The editor tracks completion indicators (`completedLanguages`) to help admins fill every language variant.

## Additional helpers

- `src/lib/productCrud.js` wraps `createItem`, `updateItem`, and `deleteItem` with payload normalization (trim numbers, strip blanks, enforce multilingual format). It is optional in the current UI but instrumental when reusing the logic in other projects.
- `useLanguage` from `src/lib/LanguageContext.js` supplies translations for UI labels (`t("create")`, `t("delete")`, etc.) and controls the global language that the admin sees.
- `FormLanguageSelector` renders at the top of the form, allowing quick switches between English, Russian, and Uzbek while editing.

## Putting it together

1. User clicks “Add New” or the edit pencil for products/categories.
2. `AdminDashboard` opens `Dialog` with `CreateEditForm model={currentModel}`.
3. `CreateEditForm` renders fields defined in `MODELS`, hooking into multilingual components, file uploads, and select options.
4. On submit, the form calls `createItem`/`updateItem`. The store POSTs/PUTs, revalidates, and refetches data.
5. `DataTable` refreshes with the latest results. Delete uses the same store path via `AlertDialog`.

This architecture keeps product and category management consistent, centralises translation-aware inputs, and ensures the storefront receives fully normalised multilingual payloads (including rich text and table-based specifications). Use the same components and store actions when porting the admin features to other projects.
