# BCT ERP Runtime Notes

## Structure

- Frontend: [`ERP-BCT-main`](./ERP-BCT-main)
- Backend: [`bct-server-main`](./bct-server-main)
- Local scripts: [`scripts`](./scripts)
- Runtime files and logs: [`.local-runtime`](./.local-runtime)

## Local ports

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:9000`
- Backend health: `http://localhost:9000/health`
- MongoDB: `27017` via Docker container `mongodb`

## Start / Stop / Status

### Start full stack

```bash
./scripts/start-local.sh
```

What it does:

- starts Docker-backed MongoDB if needed
- builds backend binary into `.local-runtime/backend-local`
- launches backend on `9000`
- builds frontend
- launches frontend on `3000`
- verifies readiness by real HTTP checks

### Check status

```bash
./scripts/status-local.sh
```

### Stop local processes

```bash
./scripts/stop-local.sh
```

## Logs

- Frontend log: [`.local-runtime/frontend.log`](./.local-runtime/frontend.log)
- Backend log: [`.local-runtime/backend.log`](./.local-runtime/backend.log)

## Environment

Frontend local env:

- [`ERP-BCT-main/.env.local`](./ERP-BCT-main/.env.local)

Expected values:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:9000/api
```

## Important architecture notes

### i18n

- Server-safe language normalization lives in [`src/lib/i18n-utils.js`](./ERP-BCT-main/src/lib/i18n-utils.js)
- Client i18n lives in [`src/lib/i18n.js`](./ERP-BCT-main/src/lib/i18n.js)
- Server layout reads language cookie in [`src/app/layout.js`](./ERP-BCT-main/src/app/layout.js)
- Runtime language sync is handled in [`src/providers/LanguageProvider.jsx`](./ERP-BCT-main/src/providers/LanguageProvider.jsx)

### Theme

- Global tokens and theme rules live in [`src/app/globals.css`](./ERP-BCT-main/src/app/globals.css)
- Theme toggle lives in [`src/components/shared/ThemeToggle.jsx`](./ERP-BCT-main/src/components/shared/ThemeToggle.jsx)

### Shared data grid

- Main shared table layer: [`src/components/shared/DataTable.jsx`](./ERP-BCT-main/src/components/shared/DataTable.jsx)
- Shared action columns: [`src/lib/columns.js`](./ERP-BCT-main/src/lib/columns.js)

## Known product realities

- `Warehouse` is the design reference page and should not be redesigned.
- `Finance` currently routes to profile/settings and is not yet a full finance module.
- Some older form flows still need full i18n cleanup and consistency passes.

## Recommended workflow before editing

1. Run `./scripts/start-local.sh`
2. Run `./scripts/status-local.sh`
3. Verify:
   - `http://localhost:3000/dashboard`
   - `http://localhost:9000/health`
4. Tail logs if needed

## Useful checks

```bash
curl -I http://localhost:3000/dashboard
curl http://localhost:9000/health
docker ps
```

## 2026-06-10 Release Hardening Notes

- Frontend production server was verified on `http://192.168.1.24:3000/dashboard`.
- Backend Docker stack was rebuilt and verified on `http://192.168.1.24:9000`.
- Local-network CORS was verified for `Origin: http://192.168.1.24:3000`.
- Removed the empty root `package-lock.json`; the frontend now uses only `ERP-BCT-main/package-lock.json`.
- Removed mismatched `@next/swc-wasm-nodejs@15.5.6`; it caused incomplete production server artifacts such as `.next/server/app 2`.
- Updated frontend runtime to `next@15.5.19` and pinned `postcss@8.5.10` through npm overrides.
- `npm audit --omit=dev` reports `0 vulnerabilities`.
- Warehouse stock operations now use backend-backed receipt, write-off and movement logic instead of only local UI state.
- Warehouse main page no longer pads real API data with fake products.
- Deal documents are uploaded through the frontend proxy and persisted in the contract `documents` field.
- Product image upload accepts standard image formats including JPG, PNG, GIF, WEBP, SVG, AVIF, HEIC, BMP, TIFF and ICO without frontend compression.
- Product description legacy column labels `Parameter` and `Value` are normalized for Russian and Uzbek editing.
- Product search is debounced before API calls to reduce request churn while typing.
- Contract creation/update now preserves `contract_number` and product `guarantee`.
- Contract create/update/delete synchronizes real `order_history` records for linked clients, counterparties and companies.
- Client purchase history now renders real backend `order_history` data and shows an empty state instead of mock products.
- Warehouse inventory pages no longer substitute demo products when the API returns no products or fails.
- Deal print action now opens the native print dialog instead of showing a future-feature warning.
- RU/EN/UZ locale files were key-aligned to avoid untranslated raw keys in hidden/detail flows.
- Business smoke verified contract history lifecycle: create adds `order_history`, update keeps one entry and refreshes it, delete removes the entry.

## 2026-06-10 ERP Real Data Audit Notes

- Header finance navigation now opens `/dashboard/finance` instead of the admin profile, and the header uses a wider responsive layout.
- Finance page was restored as a real-data module based on saved contracts only: total amount, paid amount, remaining amount, payment status counts and recent contract history are calculated from database records.
- Dashboard analytics no longer uses hardcoded 2024 demo chart data; client/product/deal charts are built from real API records and show empty states when no data exists.
- Client and company tables no longer inject fake order counts or fake purchase totals.
- Deal form supports `UZS`, `USD` and `EUR`, shows total/paid/remaining/payment status, and calculates full/partial/unpaid states from actual multi-payment inputs.
- Creating clients, counterparties or companies from the deal flow preserves the deal return path and refreshes reference data after save.
- Warehouse receipts no longer prefill a shared serial number. Receipts require one unique serial number per received item and store `serial_numbers`, expiration value and expiration unit on stock operations.
- Write-off page has a top-level “Create write-off” workflow with product selection, available stock, quantity validation and required reason.
- Admin profile/update backend routes now resolve the current admin from JWT `admin_id` instead of updating the first admin document in the collection. Sensitive debug password/hash output was removed.
- Settings index was restored and `/dashboard/setting/access` now displays real admin records or proper empty/error states.
- Removed unused frontend `mock-data.ts` to prevent accidental reintroduction of demo clients/products/currencies.
- Frontend dependency tree was repaired by adding a stable direct `enhanced-resolve` dependency after production build exposed a broken transitive install.

Additional verified routes:

- `/dashboard/finance`
- `/dashboard/setting/access`

Additional smoke checks:

```bash
node - <<'NODE'
const routes = ['/dashboard','/dashboard/finance','/dashboard/setting','/dashboard/setting/access','/dashboard/deals/add','/dashboard/werehouses/receipt','/dashboard/werehouses/writeoff'];
for (const route of routes) {
  const res = await fetch(`http://192.168.1.24:3000${route}`);
  console.log(res.status, route);
}
NODE
```

Backend stock validation was verified without changing product stock:

```text
duplicate serial validation 400 {"error":"serial numbers must be unique"}
serial count validation 400 {"error":"serial numbers count must match quantity"}
```

Verified commands:

```bash
npm run build
npm audit --omit=dev
go test ./...
go build ./...
docker compose up -d --build
```

Additional verification:

```bash
npm audit --omit=dev
node - <<'NODE'
const fs = require("fs");
for (const lang of ["ru", "en", "uz"]) {
  JSON.parse(fs.readFileSync(`ERP-BCT-main/src/locales/${lang}/common.json`, "utf8"));
}
NODE
```

Final route smoke on `http://192.168.1.24:3000` returned `200` for:

- `/dashboard`
- `/dashboard/clients`
- `/dashboard/clients/add`
- `/dashboard/products`
- `/dashboard/products/add`
- `/dashboard/products/categories`
- `/dashboard/deals`
- `/dashboard/deals/add`
- `/dashboard/deals/funnels`
- `/dashboard/werehouses`
- `/dashboard/werehouses/list`
- `/dashboard/werehouses/receipt`
- `/dashboard/werehouses/stocks`
- `/dashboard/werehouses/writeoff`
- `/dashboard/werehouses/movement`
- `/dashboard/setting`
- `/dashboard/setting/profile`
