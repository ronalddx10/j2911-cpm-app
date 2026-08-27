# Design Specification — Default Pax and Open-Text Venues

This design document outlines the changes to introduce a default pax count in the basic order details (persisted in the database and shown on the PDF invoice) and to allow users to input custom venues that are dynamically saved to the catalog and suggested via autocomplete.

---

## 1. Database Schema Changes

### 1.1 `f_cpm_orders` Table
- Add a new column `default_pax` (integer, default `10`, not null):
  ```typescript
  defaultPax: integer("default_pax").default(10).notNull(),
  ```

### 1.2 Database Migration
- Generate and run Drizzle migrations using `npx drizzle-kit generate` and `npx drizzle-kit push` (or `npx drizzle-kit migrate`).

---

## 2. Default Pax Logic

- **Booking Wizard / Modification Form**:
  - In Step 1 of `BookingWizardModal.tsx` and the basic info section of `OrderViewClient.tsx`, add an input field for "Default Pax".
  - In Step 2 (adding meal periods), when a new meal period is initialized, its `pax` field will default to the value of the "Default Pax" field instead of `10`.
- **Order Details / PDF Invoice**:
  - Display the "Default Pax" under the order general details.
  - Update `src/lib/pdf.ts` to output `Default Pax: [value]` on the PDF invoice layout.

---

## 3. Open-Text Venue Input with Autocomplete

- **UI Component Change**:
  - Replace the `<select>` element for Venues with an `<input>` element linked to a `<datalist id="venues-list">`.
  - The `<datalist>` is populated with all venue names from the `d_cpm_venues` catalog.
  - The user can type any venue name. If the typed text matches an existing venue name in the catalog, we store its `venueId`.
  - If the typed text does not match any existing venue name in the catalog:
    - We treat it as a new venue.
    - Upon submitting the form, a POST request is sent to create the new venue in the catalog:
      `POST /api/catalogs/venues` with `{ venueName: typedName, capacity: defaultPax, physicalAddress: customDeliveryAddress || typedName }`.
    - Once the new venue is created, its generated ID is used as the `venueId` for the order.

---

## 4. Verification Plan

1. **Verify Database Seeding & Migration**:
   - Verify migration compiles and runs.
2. **Verify Conditionally Pre-populated Pax**:
   - In Step 1, set Default Pax to `45`.
   - In Step 2, click "Add Meal Period". Check that the Pax field defaults to `45`.
3. **Verify Autocomplete & Dynamic Venue Creation**:
   - Type a new venue name: "Training Room Alpha". Enter address: "3rd floor, Main Bldg".
   - Submit the booking. Verify that a new venue is created in the catalog and the order is linked to it.
4. **Verify PDF Print**:
   - Generate and download the invoice PDF. Verify "Default Pax" is printed.
