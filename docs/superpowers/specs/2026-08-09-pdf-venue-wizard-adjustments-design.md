# PDF, Venue, and Line Item Form Adjustments Design Spec

## 1. Goal
Address PDF layout formatting requirements (page number repositioning, mobile number inclusion, daily items serialization), booking wizard venue input enhancements (manual entry, auto-suggestions, new venue cataloging), and line item form input field reordering.

---

## 2. Component Design & Changes

### A. PDF Output Generator (`src/lib/pdf.ts`)
1. **Footer Page Numbering**:
   - Remove `Page X of Y` rendering lines from `buildHeader` in both `generateInvoicePDF` and `generateKitchenPDF`.
   - Update relative Y-coordinate adjustments inside `buildHeader` (change `-320 -25 Td` to `0 -25 Td`).
   - Draw a separate footer block at the bottom center of the stream on each page loop:
     ```
     BT /F1 10 Tf 270 30 Td (Page X of Y) Tj ET
     ```
2. **Client Mobile Number**:
   - In `generateInvoicePDF`, change Client header row to:
     `Client: <Client Name>  |  Mobile: <Client Phone>`
   - In `generateKitchenPDF`, change Client header row to:
     `Client: <Client Name>  |  Mobile: <Client Phone>`
3. **Daily Order Item Standardized Layout**:
   - format each meal period details as:
     `Meal Period: <meal period> x <pax> pax (PHP <rate>/pax)`
     `(Service Time: <service time>)`
   - Render order items as:
     `Order Items:`
       `<Item Name 1> x <pax>`
       `<Item Name 2> x <pax>`

### B. Venue Input and Auto-Suggestions
1. **Frontend Inputs (`src/components/BookingWizardModal.tsx` & `src/app/orders/[id]/OrderViewClient.tsx`)**:
   - Replace `<select>` venue elements with `<input type="text">` and a `<datalist id="venues-list">` populated from catalog venues.
   - Bind input to `wizardVenueName` / `venueName` states.
   - When the typed value matches an existing venue (case-insensitive): retrieve its `venueId` and physical address. Populate the physical address input field and disable it.
   - When the typed value is a new custom venue: set `venueId` to `null` and keep the address input field enabled so the user can enter the location address.
2. **Backend API (`src/app/api/orders/route.ts` & `src/app/api/orders/[id]/route.ts`)**:
   - Accept both `venueId` and `venueName` (string) in order payloads.
   - If `venueId` is null but `venueName` is provided:
     - Check if a venue with `venueName` already exists in `d_cpm_venues` (case-insensitive query).
     - If yes, use its ID.
     - If no, dynamically insert a new record into `d_cpm_venues` with `venueName`, `physicalAddress` (from custom address input), and default `capacity = 100`. Use the new venue's inserted ID.

### C. Add/Edit Line Item Form Field Ordering
- Reorder the grid/flex inputs in `BookingWizardModal` and `OrderViewClient` to lay out fields in this exact sequence:
  1. **Period** (select)
  2. **Service Time** (input time)
  3. **Package / Menu** (select package)
  4. **Rate / Pax** (input number)
  5. **Pax** (input number)
