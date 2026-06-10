# BCT ERP Project Context

This file is the fast onboarding map for future work. Read this before scanning the whole codebase.

## Local Run

Project root:

```bash
/Users/mycomp/Documents/My_Comp/bct
```

Start the full local environment:

```bash
./scripts/start-local.sh
```

Check local status:

```bash
./scripts/status-local.sh
```

Stop local services:

```bash
./scripts/stop-local.sh
```

If detached processes do not stay alive in the current terminal environment, start them as live sessions:

```bash
cd /Users/mycomp/Documents/My_Comp/bct/ERP-BCT-main
npm run start
```

```bash
cd /Users/mycomp/Documents/My_Comp/bct/bct-server-main
/Users/mycomp/Documents/My_Comp/bct/.local-runtime/backend-local
```

Local URLs:

- Frontend: `http://localhost:3000/dashboard`
- Backend: `http://localhost:9000`
- Backend health: `http://localhost:9000/health`
- MongoDB: Docker container `mongodb` on port `27017`

## Project Layout

Frontend:

```bash
ERP-BCT-main
```

Backend:

```bash
bct-server-main
```

Runtime files and local logs:

```bash
.local-runtime
```

Useful logs:

- `.local-runtime/frontend.log`
- `.local-runtime/backend.log`

## Frontend Stack

- Next.js App Router
- React client components for interactive dashboard pages
- Tailwind utility classes
- Theme tokens are defined globally and consumed through CSS variables
- `react-i18next` is used for translations
- `lucide-react` is used for icons

Build check:

```bash
cd ERP-BCT-main
npm run build
```

## Backend Stack

- Go backend
- Fiber HTTP server
- MongoDB
- Main API base expected by frontend: `http://localhost:9000/api`

Health check:

```bash
curl -s http://localhost:9000/health
```

## Main Dashboard Routes

- `/dashboard` - home page
- `/dashboard/clients` - clients
- `/dashboard/companies` - companies
- `/dashboard/counterparties` - counterparties
- `/dashboard/products` - products
- `/dashboard/products/add` - add product
- `/dashboard/products/categories` - product categories
- `/dashboard/deals` - deals pipeline
- `/dashboard/deals/add` - create/edit deal
- `/dashboard/deals/funnels` - funnel settings
- `/dashboard/werehouses` - warehouse home
- `/dashboard/werehouses/receipt` - warehouse receipt
- `/dashboard/werehouses/stocks` - stock balances
- `/dashboard/werehouses/writeoff` - write-off flow
- `/dashboard/werehouses/movement` - movement flow
- `/dashboard/werehouses/list` - warehouse list
- `/dashboard/setting/profile` - finance/profile placeholder route in header

Note: the current route spelling is `werehouses`, not `warehouses`. Keep existing routes unless doing a deliberate migration.

## Design Rules

Warehouse is the visual reference for sizing, spacing, cards, forms, tables, and density.

Do not casually redesign Warehouse. Use it as the standard for other pages.

Prefer shared tokens instead of hardcoded colors:

- `var(--background-primary)`
- `var(--background-secondary)`
- `var(--surface)`
- `var(--surface-elevated)`
- `var(--surface-hover)`
- `var(--border-default)`
- `var(--border-subtle)`
- `var(--text-primary)`
- `var(--text-secondary)`
- `var(--text-muted)`
- `var(--accent)`
- `var(--accent-hover)`
- `var(--danger)`

Avoid introducing direct `#fff`, `white`, hardcoded black text, or one-off light surfaces unless the design requires it and dark mode is handled.

## Navigation Rules

Use `BackLinkButton` from:

```bash
ERP-BCT-main/src/components/shared/BackLinkButton.jsx
```

For deterministic back navigation, prefer `href` over `router.back()`.

Examples:

```jsx
<BackLinkButton href="/dashboard/werehouses" />
<BackLinkButton href="/dashboard/products" />
```

Use `router.push()` only when the destination depends on runtime state or query params.

`BackLinkButton` supports `href` plus an optional `onClick`. Use this pattern when a page must clear local state before leaving but still needs deterministic navigation:

```jsx
<BackLinkButton href="/dashboard/deals" onClick={handleBack} />
```

## Recent Fixes

### Deals page startup crash

File:

```bash
ERP-BCT-main/src/app/dashboard/deals/page.jsx
```

Issue:

`fallbackFunnels` was referenced before it existed and a `useMemo` block was left outside the component, causing `next start` to crash with:

```text
ReferenceError: t is not defined
```

Fix:

`fallbackFunnels` now lives inside `DealsPage`, after `const { t } = useTranslation()` and before `effectiveFunnels`.

### Warehouse receipt back button

File:

```bash
ERP-BCT-main/src/app/dashboard/werehouses/receipt/page.jsx
```

Issue:

The back button used an inline `router.push()`.

Fix:

It now uses:

```jsx
<BackLinkButton href="/dashboard/werehouses" />
```

This matches the intended warehouse flow and avoids history-dependent navigation.

### Warehouse child-page back buttons

Files:

```bash
ERP-BCT-main/src/components/warehouse/WarehouseInventoryClient.jsx
ERP-BCT-main/src/app/dashboard/werehouses/list/page.jsx
```

Issue:

Only the receipt page had the visible deterministic warehouse back button. Other warehouse child routes such as stocks, write-off, movement, and warehouse list looked like child pages but had no consistent parent navigation.

Fix:

Warehouse inventory child pages now inherit:

```jsx
<BackLinkButton href="/dashboard/werehouses" />
```

The warehouse list page uses the same deterministic parent link. Keep this pattern for every nested warehouse route.

### Language provider render-side effect

File:

```bash
ERP-BCT-main/src/providers/LanguageProvider.jsx
```

Issue:

`i18n.changeLanguage(...)` was called during render. This can create hydration mismatches and language flicker.

Fix:

Language synchronization now happens in effects only. Server `html lang` still comes from the `i18nextLng` cookie.

### Create deal back button

File:

```bash
ERP-BCT-main/src/app/dashboard/deals/add/page.tsx
```

Issue:

The back button used an imperative handler and had a malformed `router. push(...)` call. This made the behavior less predictable and easier to break.

Fix:

The button now uses a deterministic parent route and keeps the form cleanup as a separate click side effect:

```jsx
<BackLinkButton href="/dashboard/deals" onClick={handleBack} />
```

`BackLinkButton` now passes `onClick` through to `Link` when `href` is provided.

### Deterministic back buttons

Files updated:

```bash
ERP-BCT-main/src/components/deals/BarcodeProductSelector.jsx
ERP-BCT-main/src/components/forms/ClientForm.jsx
ERP-BCT-main/src/components/forms/CompanyForm.jsx
ERP-BCT-main/src/components/forms/CounterpartyForm.jsx
ERP-BCT-main/src/components/forms/FunnelForm.jsx
```

Issue:

Some child screens used:

```jsx
<BackLinkButton onClick={() => router.push("/parent")} />
```

Fix:

Use deterministic links instead:

```jsx
<BackLinkButton href="/dashboard/clients" />
<BackLinkButton href="/dashboard/companies" />
<BackLinkButton href="/dashboard/counterparties" />
<BackLinkButton href="/dashboard/deals" />
```

Keep `router.push(...)` for submit/delete success flows where the navigation is part of the action result.

### Locale key audit

Files:

```bash
ERP-BCT-main/src/locales/ru/common.json
ERP-BCT-main/src/locales/en/common.json
ERP-BCT-main/src/locales/uz/common.json
```

Issue:

Duplicate top-level locale sections such as `dealForm`, `dealProduct`, `dealProducts`, `dealCategories`, `categoryForm`, and `productForm` can silently override the full dictionaries because JSON parsing keeps the last duplicate key. This caused mixed languages and raw translation keys in the UI.

Fix:

The duplicate short sections were removed and missing keys were merged into the main sections. Current translation key audit passes with zero missing keys for `ru`, `en`, and `uz`.

Quick audit command:

```bash
node - <<'NODE'
const fs=require('fs'); const path=require('path');
const root='ERP-BCT-main/src';
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name); return e.isDirectory()?walk(p):(p.match(/\.(jsx?|tsx?)$/)?[p]:[])})}
const keyRe=/\bt\(\s*['"]([^'"]+)['"]/g;
const keys=new Set();
for(const f of walk(root)){ const s=fs.readFileSync(f,'utf8'); let m; while((m=keyRe.exec(s))) keys.add(m[1]); }
function has(obj,k){return k.split('.').reduce((a,p)=>a&&Object.prototype.hasOwnProperty.call(a,p)?a[p]:undefined,obj)!==undefined}
for(const lang of ['ru','en','uz']){
  const obj=JSON.parse(fs.readFileSync(`${root}/locales/${lang}/common.json`,'utf8'));
  const missing=[...keys].filter(k=>!has(obj,k)).sort();
  console.log(lang, missing.length);
  if(missing.length) console.log(missing.join('\n'));
}
NODE
```

### June 2026 stability and UI pass

Files updated:

```bash
ERP-BCT-main/tsconfig.json
ERP-BCT-main/src/app/dashboard/werehouses/receipt/page.jsx
ERP-BCT-main/src/app/dashboard/werehouses/list/page.jsx
ERP-BCT-main/src/components/forms/FormLanguageContext.jsx
ERP-BCT-main/src/components/shared/MultilingualInput.jsx
ERP-BCT-main/src/app/dashboard/deals/add/page.tsx
ERP-BCT-main/src/components/DealForm.tsx
ERP-BCT-main/src/components/DealTable.tsx
ERP-BCT-main/src/app/globals.css
ERP-BCT-main/src/locales/ru/common.json
ERP-BCT-main/src/locales/en/common.json
ERP-BCT-main/src/locales/uz/common.json
```

Issue:

Several dashboard flows had client-side crashes, stale Next.js chunks, incomplete editable states, mixed-language UI, and dark-mode contrast regressions. The affected areas were clients, deals, products, warehouse receipt, warehouse list, product creation language switching, deal creation layout, and global dark-mode readability.

Fix:

- `tsconfig.json` now uses `moduleResolution: "bundler"` and no deprecated `baseUrl`, removing TypeScript deprecation warnings.
- Stale Next.js runtime/cache problems were resolved by restarting the local frontend after successful builds.
- Warehouse receipt is now an editable controlled form with validation and real image selection through the existing `AddImages` component.
- Warehouse list now supports explicit create/edit mode instead of only delete.
- Product form language switching now synchronizes `FormLanguageContext` with global `i18next`, so labels, placeholders, and headings switch together.
- Create deal page was adjusted closer to the provided template without changing unrelated flows.
- Deal form/table controls were tightened for better density and consistency.
- Dark-mode readability was fixed through scoped global token rules, preserving the original dark background and removing the unwanted bottom light stripe.
- Deal add translations were aligned for Russian, English, and Uzbek.

Verification:

```bash
cd ERP-BCT-main
npm run build
```

The latest build completed successfully. Markdown documentation files are present at the project root, frontend docs, and backend docs. Use `PROJECT_CONTEXT.md` as the main project-change context file.

## Common Checks Before Reporting Done

Run:

```bash
cd ERP-BCT-main
npm run build
```

Then verify:

```bash
curl -I http://localhost:3000/dashboard
curl -s http://localhost:9000/health
```

Check for hard crashes:

```bash
tail -80 /Users/mycomp/Documents/My_Comp/bct/.local-runtime/frontend.log
tail -80 /Users/mycomp/Documents/My_Comp/bct/.local-runtime/backend.log
```

## Current Product Notes

- The user wants a professional ERP feel, strict consistency with the Figma screenshots, and Warehouse-level sizing across pages.
- Dark mode must not contain white surfaces or unreadable controls.
- Language switching has had mixed-language issues before; when working on translations, update all relevant keys and avoid hardcoded display strings.
- Back buttons should appear only where the screen is a child workflow and should return to the logical parent screen, not random browser history.
