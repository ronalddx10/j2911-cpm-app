# Default Pax and Custom Venues Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `default_pax` column to `f_cpm_orders` table (acting as baseline for meal period line items and displaying on invoice PDFs), and convert the Venue selection dropdown to an autocomplete text input that auto-creates new venues in the catalog.

**Architecture:** Extend Drizzle schema with `defaultPax` field, generate/apply migration. Implement combobox/datalist for Venues. Modify API endpoints and components to save/update `defaultPax` and dynamically register new venues. Add "Default Pax" field on PDF layouts.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Drizzle ORM.

## Global Constraints

- Preserve all existing comments and docstrings.
- Ensure type consistency.
- Run `npm run build` to verify compiling.

---

### Task 1: Database Migration for Default Pax

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add defaultPax column to schema**

  Modify `src/lib/db/schema.ts` under the `orders` table (around lines 109-110):
  ```typescript
  defaultPax: integer("default_pax").default(10).notNull(),
  ```

- [ ] **Step 2: Generate and apply migrations**

  Run: `npx drizzle-kit generate` and `npx drizzle-kit push` (or `npx drizzle-kit migrate`).

- [ ] **Step 3: Commit changes**

  ```bash
  git add src/lib/db/schema.ts
  git commit -m "db: add defaultPax column to orders schema"
  ```

---

### Task 2: API and Frontend Updates for Default Pax

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts`
- Modify: `src/app/api/orders/[id]/approve/route.ts`
- Modify: `src/lib/pdf.ts`

- [ ] **Step 1: Save/update defaultPax in backend order routes**

  Update `src/app/api/orders/route.ts` and `src/app/api/orders/[id]/route.ts` to accept `defaultPax` from payload and save/update it on the database.
  Also, update the order queries (e.g. in `approve/route.ts` and `route.ts`) to make sure `defaultPax` is correctly returned.

- [ ] **Step 2: Update PDF Layouts**

  Modify `src/lib/pdf.ts` in `generateInvoicePDF` and `generateKitchenPDF` to print the default pax (e.g., `Default Pax: [pax]` or `No. of Pax: [pax]`) alongside basic order details.

- [ ] **Step 3: Commit changes**

  ```bash
  git add src/app/api/orders/route.ts src/app/api/orders/[id]/route.ts src/app/api/orders/[id]/approve/route.ts src/lib/pdf.ts
  git commit -m "backend: save defaultPax in API routes and display on PDF invoice"
  ```

---

### Task 3: Booking Wizard (Autocomplete and Default Pax)

**Files:**
- Modify: `src/components/BookingWizardModal.tsx`

- [ ] **Step 1: Add Default Pax input field and pre-population logic**

  Modify `src/components/BookingWizardModal.tsx`:
  - Add `wizardDefaultPax` state (`useState<number>(10)`).
  - Add input field in Step 1 for "Default Pax".
  - In `resetDraftForm` or when adding a new meal period, set `draftPax` to `wizardDefaultPax` instead of `10`.

- [ ] **Step 2: Implement Venue Autocomplete & Dynamic Creation**

  - Replace the Venue select dropdown with a text input linked to a `<datalist id="venues-list">`.
  - On submit, if the venue name does not match any existing venue, make a `POST` request to `/api/catalogs/venues` to register it first. Use the created ID as `venueId`.

- [ ] **Step 3: Commit changes**

  ```bash
  git add src/components/BookingWizardModal.tsx
  git commit -m "frontend: integrate default pax and venue autocomplete in wizard"
  ```

---

### Task 4: Booking Modifier (Autocomplete and Default Pax)

**Files:**
- Modify: `src/app/orders/[id]/OrderViewClient.tsx`
- Modify: `src/components/OrderDetailDrawer.tsx`

- [ ] **Step 1: Implement Venue Autocomplete & Default Pax input in OrderViewClient**

  - Add `defaultPax` field in the basic details form.
  - Implement the Venue `<datalist>` autocomplete input.
  - Save/update dynamic venues on save revisions.

- [ ] **Step 2: Display Default Pax in OrderDetailDrawer**

  - Show "Default Pax: [pax]" inside the order summary details.

- [ ] **Step 3: Commit changes**

  ```bash
  git add src/app/orders/[id]/OrderViewClient.tsx src/components/OrderDetailDrawer.tsx
  git commit -m "frontend: integrate default pax and venue autocomplete in edit views"
  ```
