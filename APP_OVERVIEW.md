# OrderSlip — Current App Overview

Snapshot of how the app works **today**. Product identity in the UI is **OrderSlip** / **Order Slip — Delivery & Picking Sheets**.

## What it does

OrderSlip is a small operations tool for creating **customer orders** and printing **delivery / picking slips**.

Typical use:

1. Keep **customers** and **products** up to date (Admin)
2. Build an order: pick a customer, add line items and quantities (New Order)
3. Open the generated slip and **print / save as PDF** via the browser

Document numbers look like `DOC-1000`, `DOC-1001`, … (from a Postgres sequence starting at 1000).

There is **no** orders list/history, order editing, pricing, tax totals, or login UI.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| App framework | TanStack Start + TanStack Router (file-based) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix), lucide-react |
| Data | Supabase (Postgres + JS client / PostgREST) |
| Spreadsheets | ExcelJS (`.xlsx` + CSV) |
| Toasts | sonner |
| Build | Vite 8 (`@lovable.dev/vite-tanstack-config`) |
| Deploy target | Nitro (Lovable default: Cloudflare) |
| Language | TypeScript |

The repo is connected to [Lovable](https://lovable.dev) (see `AGENTS.md`). Data access is primarily **browser → Supabase**; there is no custom API surface for domain CRUD.

---

## Screens & routes

| Path | Screen | Purpose |
|------|--------|---------|
| `/` | New Order | Create a delivery slip (customer + line items) |
| `/admin` | Admin | Manage customers & products; bulk Excel/CSV import |
| `/orders/$id` | Delivery / Picking Slip | Printable slip for a created order |

Nav (root layout): **OrderSlip** brand, links to **New Order** and **Admin**.

---

## Data model

```
customers 1──* orders 1──* order_items *──1 products
```

- Deleting a customer is **restricted** if orders exist
- Deleting a product is **restricted** if order items exist
- Deleting an order **cascades** its line items

Orders and line items **snapshot** customer/product fields at create time so slips stay stable if master data changes later.

### `customers`

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `name` | Required |
| `account_code` | |
| `delivery_address` | |
| `reference` | |
| `tax_number` | |
| `tax_rate` | Numeric; import can map “exempt” → `0` |
| `sales_code` | |
| `created_at` / `updated_at` | |

### `products`

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `code` | Required |
| `description` | Required |
| `unit` | Required (e.g. kg, box, ea) |
| `created_at` / `updated_at` | |

### `orders`

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `document_number` | Unique; default `DOC-` + sequence |
| `customer_id` | FK → customers |
| `order_date` | Defaults to today |
| `delivery_date` | Optional |
| `customer_name`, `account_code`, `delivery_address`, `reference`, `sales_code` | Snapshots |
| `created_at` | |

No order status, price, or tax totals.

### `order_items`

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `order_id` | FK → orders (cascade) |
| `product_id` | FK → products (restrict) |
| `product_code`, `product_description`, `product_unit` | Snapshots |
| `quantity` | Must be `> 0` |
| `position` | Line order |
| `created_at` | |

Schema lives in `supabase/migrations/`. Generated types: `src/integrations/supabase/types.ts`.

---

## User flows

### Create a delivery slip (`/`)

1. Load customers and products from Supabase
2. Select a customer (searchable combobox) — account, reference, sales, tax, and address show as read-only
3. Optionally set a delivery date
4. Add lines: product + quantity (unit comes from the product)
5. **Create delivery slip** inserts `orders` + `order_items`, then navigates to `/orders/:id`

Validation: customer required; at least one line with a product and quantity &gt; 0.

### Print the slip (`/orders/$id`)

- Shows document number, dates, deliver-to block, account/reference/sales, and item table
- Pads blank rows (to at least 6) for handwritten notes
- Signature / date footer (“Received in good order”)
- **Print / Save PDF** calls `window.print()`; chrome UI is hidden for print

### Admin (`/admin`)

Tabs:

- **Customers** — list, add/edit dialog, delete, bulk import
- **Products** — list, add/edit dialog, delete, bulk import

### Bulk import (Admin)

Implemented in `src/components/BulkImportDialog.tsx` (ExcelJS):

1. Download an `.xlsx` template (optional)
2. Upload `.xlsx` or `.csv` (legacy `.xls` is rejected)
3. Headers auto-map via field keys, labels, and aliases
4. Validate required fields; detect duplicates in DB and within the file
5. Choose **Skip duplicates** or **Overwrite existing**
6. Run import → summary: added / updated / skipped / errors

**Customer dedupe:** `account_code`, fallback `name`  
**Product dedupe:** `code`

---

## Auth & access (current)

- **No login UI** and no route-level auth gates
- Supabase client supports sessions, and auth middleware helpers exist under `src/integrations/supabase/`, but feature pages do not use them
- RLS is enabled with **open** policies (`USING (true) / WITH CHECK (true)` for `anon` and `authenticated`)

Effectively: anyone with the publishable key can read/write master data and orders. Treat that as a known current posture, not a hardened production setup.

---

## Project layout (high level)

```
src/
  routes/                 # Pages: index, admin, orders/$id, root shell
  components/
    BulkImportDialog.tsx  # Excel/CSV import for customers & products
    ui/                   # shadcn primitives
  integrations/supabase/  # Client, types, auth helpers
  lib/                    # Utils, Lovable error reporting
supabase/
  migrations/             # Schema + RLS
```

---

## Dev commands

```bash
npm run dev        # Vite dev server
npm run build      # Production build
npm run build:dev  # Development-mode build
npm run preview    # Preview production build
npm run lint       # ESLint
npm run format     # Prettier
```

`bun.lock` is tracked; Bun or npm both work for installs.

### Environment variables (names only)

| Variable | Used for |
|----------|----------|
| `VITE_SUPABASE_URL` | Browser / Vite client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser / Vite client |
| `VITE_SUPABASE_PROJECT_ID` | Present in env; not required by the main client module |
| `SUPABASE_URL` | SSR fallback |
| `SUPABASE_PUBLISHABLE_KEY` | SSR fallback |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin client (not used by the current UI flows) |

---

## What’s intentionally absent today

- Authentication / roles in the UI
- Orders list, search, or edit-after-create
- Pricing, inventory, or tax calculation on slips
- Custom backend APIs or Supabase Edge Functions for domain logic
- Legacy `.xls` import (use `.xlsx` or `.csv`)

---

*Generated as a description of the repo at the time of writing; update this file when major behavior changes.*
