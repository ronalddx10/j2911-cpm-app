# CPM Feature Pack - Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Design spec:** `2026-08-10-feature-pack-design.md`

**Tech stack:** Next.js 16, Drizzle ORM, node-postgres, TypeScript

## Global Constraints
- Preserve all existing comments and docstrings.
- Maintain formatting: snake_case for DB columns, camelCase for API/TypeScript.
- All TypeScript must compile cleanly with 0 errors: `npx tsc --noEmit`.
- Each task must be committed before the next task begins.
- Migration files go in `./drizzle/`. Run with `npx tsx --env-file=.env src/lib/db/migrate.ts`.

---

## Task 1: DB Table Renaming — Schema + Migration

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/<timestamp>_rename_tables.sql` (raw SQL migration)

### Steps

- [ ] **1.1** In `src/lib/db/schema.ts`, update every `pgTable("...")` first argument to match this mapping:

  | Old name | New name |
  |---|---|
  | `d_cpm_offices` | `cpm_offices` |
  | `d_cpm_clients` | `cpm_clients` |
  | `d_cpm_venues` | `cpm_venues` |
  | `d_cpm_service_types` | `cpm_service_types` |
  | `d_cpm_order_status` | `cpm_order_statuses` |
  | `d_cpm_menus` | `cpm_menus` |
  | `d_cpm_items` | `cpm_items` |
  | `d_cpm_users` | `cpm_users` |
  | `bridge_cpm_menu_items` | `cpm_menu_items` |
  | `bridge_cpm_order_days` | `cpm_order_days` |
  | `bridge_cpm_meal_periods` | `cpm_meal_periods` |
  | `bridge_cpm_meal_period_items` | `cpm_meal_period_items` |
  | `f_cpm_orders` | `cpm_orders` |
  | `f_cpm_order_history` | `cpm_order_history` |

  Also fix the unique constraint name on `cpm_order_days`:
  `"bridge_cpm_order_days_order_id_event_date_key"` → `"cpm_order_days_order_id_event_date_key"`

- [ ] **1.2** Generate a raw SQL migration file at `drizzle/<timestamp>_rename_tables.sql` with:
  ```sql
  ALTER TABLE d_cpm_offices RENAME TO cpm_offices;
  ALTER TABLE d_cpm_clients RENAME TO cpm_clients;
  ALTER TABLE d_cpm_venues RENAME TO cpm_venues;
  ALTER TABLE d_cpm_service_types RENAME TO cpm_service_types;
  ALTER TABLE d_cpm_order_status RENAME TO cpm_order_statuses;
  ALTER TABLE d_cpm_menus RENAME TO cpm_menus;
  ALTER TABLE d_cpm_items RENAME TO cpm_items;
  ALTER TABLE d_cpm_users RENAME TO cpm_users;
  ALTER TABLE bridge_cpm_menu_items RENAME TO cpm_menu_items;
  ALTER TABLE bridge_cpm_order_days RENAME TO cpm_order_days;
  ALTER TABLE bridge_cpm_meal_periods RENAME TO cpm_meal_periods;
  ALTER TABLE bridge_cpm_meal_period_items RENAME TO cpm_meal_period_items;
  ALTER TABLE f_cpm_orders RENAME TO cpm_orders;
  ALTER TABLE f_cpm_order_history RENAME TO cpm_order_history;
  ```

- [ ] **1.3** Run the migration: `npx tsx --env-file=.env src/lib/db/migrate.ts`

- [ ] **1.4** Verify: `npx tsc --noEmit` passes. Commit.

---

## Task 2: Menu Items — Add `unit_price` + Update Categories

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/app/api/catalogs/items/route.ts`
- Modify: `src/components/CatalogManager.tsx`
- Modify: `src/types.ts`
- Create: `drizzle/<timestamp>_add_unit_price_to_items.sql`

### Steps

- [ ] **2.1** In `schema.ts` add `unitPrice` to the `items` table:
  ```ts
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  ```

- [ ] **2.2** Create migration SQL:
  ```sql
  ALTER TABLE cpm_items ADD COLUMN unit_price numeric(10,2) NOT NULL DEFAULT 0.00;
  ```
  Run migration.

- [ ] **2.3** In `src/types.ts`, add `unitPrice: string` to any item-related interfaces.

- [ ] **2.4** Update `src/app/api/catalogs/items/route.ts`:
  - `POST`: Accept and insert `unitPrice` from request body.
  - Add `PUT /api/catalogs/items/[id]/route.ts` (new file): accept `itemName`, `category`, `unitPrice` and update the record.

- [ ] **2.5** In `CatalogManager.tsx`, update the `categories` array:
  ```ts
  const categories = [
    { value: 'BREAKFAST', label: 'Breakfast' },
    { value: 'SNACK', label: 'Snack' },
    { value: 'LUNCH_DINNER', label: 'Lunch/Dinner' },
    { value: 'APPETIZER', label: 'Appetizer' },
    { value: 'SOUP', label: 'Soup/Salad' },
    { value: 'DESSERT', label: 'Dessert' },
    { value: 'DRINKS', label: 'Drinks' },
  ];
  ```

- [ ] **2.6** In `CatalogManager.tsx` Add Catalog Dish form:
  - Add `Unit Price` number input field (state: `itemUnitPrice`).
  - Default value: `''`.
  - Include in the `POST /api/catalogs/items` body.

- [ ] **2.7** In `CatalogManager.tsx` items list table:
  - Add `Unit Price` column showing `₱{item.unitPrice}`.
  - Add "Edit" button per row that opens a pre-filled edit modal/form.

- [ ] **2.8** Edit Modal for items:
  - Pre-fills name, category, unit price.
  - Calls `PUT /api/catalogs/items/[id]` on submit.

- [ ] **2.9** `npx tsc --noEmit`. Commit.

---

## Task 3: Audit Trails — Schema + APIs + UI

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/app/api/catalogs/menus/route.ts`
- Modify: `src/app/api/catalogs/menus/[id]/route.ts`
- Modify: `src/app/api/catalogs/items/route.ts`
- Modify: `src/app/api/catalogs/items/[id]/route.ts` (created in Task 2)
- Modify: `src/app/api/clients/route.ts` (POST)
- Create: `src/app/api/clients/[id]/route.ts` (PUT)
- Modify: `src/components/CatalogManager.tsx`
- Modify: `src/components/ClientManager.tsx`
- Create: `drizzle/<timestamp>_add_audit_columns.sql`

### Steps

- [ ] **3.1** In `schema.ts` add audit columns:
  - `cpm_menus`: `updatedAt: timestamp("updated_at").defaultNow().notNull()`, `createdByUserId: bigint(...)`, `updatedByUserId: bigint(...)`
  - `cpm_items`: `createdAt: timestamp(...)`, `updatedAt: timestamp(...)`, `createdByUserId: bigint(...)`, `updatedByUserId: bigint(...)`
  - `cpm_clients`: `updatedAt: timestamp(...)`, `createdByUserId: bigint(...)`, `updatedByUserId: bigint(...)`

- [ ] **3.2** Create and run migration SQL:
  ```sql
  ALTER TABLE cpm_menus
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT NOW(),
    ADD COLUMN created_by_user_id bigint,
    ADD COLUMN updated_by_user_id bigint;

  ALTER TABLE cpm_items
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT NOW(),
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT NOW(),
    ADD COLUMN created_by_user_id bigint,
    ADD COLUMN updated_by_user_id bigint;

  ALTER TABLE cpm_clients
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT NOW(),
    ADD COLUMN created_by_user_id bigint,
    ADD COLUMN updated_by_user_id bigint;
  ```

- [ ] **3.3** Update API routes to capture `x-user-id` header and write to audit columns:
  - `POST /api/catalogs/menus` → set `createdByUserId`
  - `PUT /api/catalogs/menus/[id]` → set `updatedByUserId`, update `updatedAt`
  - `POST /api/catalogs/items` → set `createdByUserId`
  - `PUT /api/catalogs/items/[id]` → set `updatedByUserId`, update `updatedAt`
  - `POST /api/clients` → set `createdByUserId`
  - Add `PUT /api/clients/[id]/route.ts` → update client fields + set `updatedByUserId`, update `updatedAt`

- [ ] **3.4** Add "Edit" button per Menu Package row in `CatalogManager.tsx`.
  - Pre-fills the existing menu create modal with data.
  - Calls `PUT /api/catalogs/menus/[id]` on submit.
  - Show `Created by user #{id}` / `Updated by user #{id}` as small metadata under each menu card.

- [ ] **3.5** Add "Edit" button per Client row in `ClientManager.tsx`.
  - Opens a pre-filled edit drawer/modal.
  - Calls `PUT /api/clients/[id]` on submit.
  - Show `Updated at: {date}` in the client detail.

- [ ] **3.6** `npx tsc --noEmit`. Commit.

---

## Task 4: Seed Standard Meal Period Menu Packages

**Files:**
- Modify: `src/lib/db/seed.ts`

### Steps

- [ ] **4.1** In `seed.ts`, inside section `// 6. Seed Menus`, add the 5 standard packages before (or after) existing menus:
  ```ts
  const standardPackages = [
    { title: 'Standard Breakfast', description: 'Standard breakfast catering package', baseRate: '0.00', isActive: true },
    { title: 'Standard AM Snack',  description: 'Standard morning snack package',      baseRate: '0.00', isActive: true },
    { title: 'Standard Lunch',     description: 'Standard lunch catering package',     baseRate: '0.00', isActive: true },
    { title: 'Standard PM Snack',  description: 'Standard afternoon snack package',    baseRate: '0.00', isActive: true },
    { title: 'Standard Dinner',    description: 'Standard dinner catering package',    baseRate: '0.00', isActive: true },
  ];
  ```
  Use the same idempotent upsert pattern (check if exists, skip if already present).

- [ ] **4.2** Run: `npx tsx --env-file=.env src/lib/db/seed.ts`

- [ ] **4.3** `npx tsc --noEmit`. Commit.

---

## Task 5: Order List Month/Year Filters + PDF Report

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/api/orders/route.ts`
- Create: `src/app/api/orders/report-pdf/route.ts`
- Modify: `src/lib/pdf.ts`

### Steps

- [ ] **5.1** In `page.tsx`:
  - Add state: `monthFilter` (default `'ALL'`) and `yearFilter` (default `'ALL'`).
  - Add Month dropdown (All Months, Jan–Dec mapped to 1–12).
  - Add Year dropdown (All Years, current year going back 4 years).
  - Pass `month` and `year` as query params to `fetchOrders()`.
  - Add a "Download Report" button (icon: `FileDown`) in the Orders toolbar that calls `GET /api/orders/report-pdf` with all active filters and triggers file download.

- [ ] **5.2** In `GET /api/orders/route.ts`:
  - Accept `month` (1–12) and `year` (4-digit) query params.
  - Build a compound WHERE condition using Drizzle's `sql` template:
    - Filter orders where `EXTRACT(MONTH FROM created_at) = month` **OR** order has an order day where `EXTRACT(MONTH FROM event_date) = month`.
    - Same for year.
  - Combine with existing status and search filters.

- [ ] **5.3** Create `src/app/api/orders/report-pdf/route.ts`:
  - Accepts same query params as `GET /api/orders` (status, search, month, year) but no pagination.
  - Queries all matching orders with client, venue, status joined.
  - Calls a new `generateOrderListPDF(orders, filters)` function from `src/lib/pdf.ts`.
  - Returns `Content-Type: application/pdf` with filename `order-report-{timestamp}.pdf`.

- [ ] **5.4** In `src/lib/pdf.ts`, add `generateOrderListPDF(orders, filters)`:
  - Blue header card with "CPM ORDER MONITORING SYSTEM — ORDER REPORT".
  - Sub-header row with applied filter labels (Month, Year, Status).
  - Table with columns: `Order ID | Client | Event Date(s) | Service Type | Status | Grand Total`.
  - One row per order. Alternate row background: white / slate-50.
  - Footer: page number centered, "CPM Order Report" label.
  - Uses same design tokens as other PDFs (Blue-600 header, Slate body, Slate-200 dividers).

- [ ] **5.5** `npx tsc --noEmit`. Commit.

---

## Task 6: Operational Catalog PDF Reports

**Files:**
- Create: `src/app/api/catalogs/menus/report-pdf/route.ts`
- Create: `src/app/api/catalogs/items/report-pdf/route.ts`
- Modify: `src/lib/pdf.ts`
- Modify: `src/components/CatalogManager.tsx`

### Steps

- [ ] **6.1** In `src/lib/pdf.ts`, add `generateMenuCatalogPDF(menus)`:
  - Blue header card: "CPM ORDER MONITORING SYSTEM — MENU PACKAGES REPORT".
  - Table: `Package Name | Description | Base Rate | Menu Items Count | Status`.
  - Footer: page number centered.

- [ ] **6.2** In `src/lib/pdf.ts`, add `generateMenuItemsPDF(items)`:
  - Blue header card: "CPM ORDER MONITORING SYSTEM — MENU ITEMS REPORT".
  - Table: `Item Name | Category | Unit Price`.
  - Footer: page number centered.

- [ ] **6.3** Create `src/app/api/catalogs/menus/report-pdf/route.ts`:
  - GET handler: queries all menus with item counts, calls `generateMenuCatalogPDF`, returns PDF blob.

- [ ] **6.4** Create `src/app/api/catalogs/items/report-pdf/route.ts`:
  - GET handler: queries all items ordered by category then name, calls `generateMenuItemsPDF`, returns PDF blob.

- [ ] **6.5** In `CatalogManager.tsx`:
  - On the Menu Packages tab toolbar, add "Download Report" button → `GET /api/catalogs/menus/report-pdf`.
  - On the Menu Items tab toolbar, add "Download Report" button → `GET /api/catalogs/items/report-pdf`.
  - Both trigger browser file download (same pattern as invoice PDF download).

- [ ] **6.6** `npx tsc --noEmit`. Commit.

---

## Task 7: Final Verification & Build Check

- [ ] **7.1** Run `npx tsc --noEmit` — expect 0 errors.
- [ ] **7.2** Run `npm run build` — expect clean production build.
- [ ] **7.3** Merge `feature/feature-pack` into `main`.
