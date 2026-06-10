# Product & Category Image Upload Guide

Use this guide when you need to recreate the image upload flow from `bct-admin` inside another codebase. It covers how the UI renders file inputs, how uploads are sent to the backend, and what payload shape both products and categories expect.

---

## 1. Field Metadata

Image handling starts with the model definitions in `src/lib/models.js`. The form renderer reads these definitions to decide whether to show a single file picker (`type: "file"`) or a multi-file gallery (`type: "file-multiple"`):

```js
export const MODELS = {
  categories: {
    fields: [
      { key: "name", type: "multilingual", required: true },
      { key: "image", type: "file" },              // single image path string
    ],
  },
  products: {
    fields: [
      { key: "name", type: "multilingual", required: true },
      { key: "image", type: "file-multiple" },     // array of image paths
      { key: "description", type: "multilingual-table", required: true },
      // ...other fields
    ],
  },
};
```

When porting the feature, copy these field definitions (or provide equivalent metadata) so your form component knows which inputs to render.

---

## 2. Form Component Responsibilities

`src/components/CreateEditForm.js` is the shared modal content for products and categories. It renders file inputs inside `renderField` based on the metadata above and delegates uploads to the store action `uploadFile`.

### 2.1 Uploading Files

```js
const handleFileUpload = async (field, files) => {
  const file = files[0];
  const result = await uploadFile(file); // returns { url }

  if (field.type === "file-multiple") {
    const current = Array.isArray(formData[field.key]) ? formData[field.key] : [];
    handleInputChange(field.key, [...current, result.url]);
  } else {
    handleInputChange(field.key, result.url);
  }

  setUploadedFiles((prev) => ({ ...prev, [field.key]: result }));
};
```

- `uploadFile` must resolve with `{ url: "/relative/path.jpg" }` (see Section 3).
- The form stores the returned URL in `formData` so that the submit handler sends paths to the API instead of raw `File` objects.
- For multi-image fields the code appends to an array; the single-image field simply replaces the existing value.

### 2.2 Previewing & Removing Images

The form reuses `next/image` for previews using the public base URL (`IMG_URL`) and lets admins delete previews before saving.

```jsx
{field.type === "file" && value && (
  <Image src={`${IMG_URL}${value}`} alt="Preview" width={80} height={80} />
)}

{field.type === "file-multiple" && Array.isArray(value) && (
  value.map((img, index) => (
    <Image key={index} src={`${IMG_URL}${img}`} alt={`Preview ${index + 1}`} />
    <Button onClick={() => removeFile(field, index)}>Remove</Button>
  ))
)}
```

`removeFile` drops the selected URL from `formData`, so the backend only receives the remaining images.

---

## 3. Store Integration & Environment

The form calls `uploadFile` from `useStore`:

```js
export const IMG_URL = process.env.NEXT_PUBLIC_IMG_URL || "http://localhost:9000";

uploadFile: async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = get().resolveBaseUrl();           // defaults to `${origin}/api`
  const uploadUrl = `${baseUrl.replace(/\/$/, "")}/files/upload`;

  const response = await fetch(uploadUrl, { method: "POST", body: formData, headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();              // expects { url }
  return data;
};
```

Key points when recreating this in another project:

- Define `NEXT_PUBLIC_IMG_URL` so previews and tables resolve image paths consistently (`IMG_URL + storedPath`).
- Keep the upload endpoint at `/files/upload` (or adjust both store and backend together).
- `createItem` / `updateItem` submit the same `formData` object, so the backend receives:
  - Categories: `{ image: "/uploads/category.jpg", ... }`
  - Products: `{ image: ["/uploads/p1.jpg", "/uploads/p2.jpg"], ... }`

---

## 4. Backend Contract

The backend must expose a `POST /files/upload` endpoint that:

1. Accepts `multipart/form-data` with a `file` field.
2. Stores the asset (local disk, S3, etc.).
3. Returns JSON containing at least the path used by the admin UI, e.g.:

```json
{ "url": "/uploads/2024/phone-1.jpg" }
```

Any additional metadata can be included, but the form only consumes `url`.

---

## 5. Displaying Uploaded Images

List views (`src/components/DataTable.js`) and edit dialogs expect categories to expose a string path and products to expose an array. When porting:

- Inject `IMG_URL` wherever you render previews, e.g. `src/components/DataTable.js` formats image columns with `Image src={`${IMG_URL}${value}`}`.
- If you reuse `src/lib/productCrud.js`, note that `buildProductPayload` ensures the product `image` field is always an array of non-empty strings before submitting to the API.

---

## 6. Migration Checklist

1. Copy the category/product image field metadata into your model/config layer.
2. Port `handleFileUpload`, `removeFile`, and the file field JSX from `CreateEditForm`.
3. Recreate `useStore().uploadFile` (keeping the `{ url }` contract) and wire auth headers if needed.
4. Configure `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_IMG_URL` so the upload request and previews use the correct host.
5. Ensure your backend implements `POST /files/upload` and returns `{ url }`.
6. Test the flow:
   - Upload a single category image, save, refresh, and confirm the preview renders.
   - Upload multiple product images, remove one before submitting, and verify the array persists correctly.

Following this checklist will give your other project the same drag-and-drop-free image management experience used in `bct-admin`.

