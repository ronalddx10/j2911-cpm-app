# PDF Layout and User Permissions Adjustments Design Spec

## 1. Goal
Format PDF invoices and kitchen production sheets to match the HTML order breakdown style (grouped by meal period with aligned columns for Rate, Pax, and Subtotal). Restructure PDF metadata rows to display Venue and Address before Special Instructions. Standardize multi-day headings to "Day X of Y" for both UI and PDF outputs. Open read access to all bookings and PDF downloads to all users, while restricting modifying and approving capabilities to admins/creators.

---

## 2. Component Design & Changes

### A. PDF Output Layout (`src/lib/pdf.ts`)
1. **Header Metadata Realignment**:
   - In `generateInvoicePDF` and `generateKitchenPDF`'s `buildHeader`:
     - Display Client and Phone details.
     - Display resolved Event Venue name and Delivery Address.
     - Display Service Type, Ingress, and Egress details.
     - Display Special Instructions.
     - Example layout commands:
       ```
       (Client: <Client Name>  |  Mobile: <Client Phone>) Tj
       (Event Venue: <Venue Name>  |  Delivery Address: <Address>) Tj
       (Service Type: <Service>  |  Ingress: <Ingress>  |  Egress: <Egress>) Tj
       (Special Instructions: <Special Instructions>) Tj
       ```
2. **Day Label Formatting**:
   - If the order has multiple days (`totalPages > 1`), format the day heading as:
     `Day X of Y: <date>`
   - Otherwise, format it as:
     `Day 1: <date>`

3. **Grouped Meal Period Column Layout**:
   - In `generateInvoicePDF`:
     - Group meal periods by name (Breakfast, AM Snack, Lunch, PM Snack, Dinner).
     - Draw the Meal Period header block:
       ```
       0 -20 Td
       /F1 11 Tf (Breakfast) Tj
       ```
     - For each meal within that period, output details in aligned columns:
       - **Col 1 (Menu Package Name & Items)**: X=50
         `(<itemName> @ <serviceTime>) Tj`
         Renders food items list in a sub-row: `(Items: <food items>) Tj`
       - **Col 2 (Rate)**: X=370
         `(PHP <rate>) Tj`
       - **Col 3 (Pax)**: X=450
         `(<pax> Pax) Tj`
       - **Col 4 (Subtotal)**: X=510
         `(PHP <subtotal>) Tj`
   - In `generateKitchenPDF`:
     - Implement the same grouped layout without columns for Rate/Subtotal (displaying Package Name/Service Time, Items, and Pax count only).

### B. Frontend Day Label Formatting (`src/app/orders/[id]/OrderViewClient.tsx`)
- Update the rendered event day label inside the Applied Catering Schedule block (around line 933):
  - If `order.orderDays.length > 1`, display: `Day {idx + 1} of {order.orderDays.length}: {formattedDate}`.
  - Otherwise, display: `Day 1: {formattedDate}`.

### C. Row-Level Security and Permissions
1. **API GET Routes (`src/app/api/orders/route.ts` & `src/app/api/orders/[id]/route.ts`)**:
   - Remove RLS filters that check `order.createdByUserId === userId` for GET queries.
   - Any authenticated user can list and view details of any order.
2. **PDF serving API Routes (`src/app/api/orders/[id]/pdf/route.ts` & `kitchen-pdf/route.ts`)**:
   - Remove the `role !== 'ADMIN' && order.createdByUserId !== BigInt(userId)` check.
   - Any logged-in user can download/print invoice and kitchen PDFs (assuming they are generated).
3. **Write / Action Routes (PUT, Approve, Return, Cancel)**:
   - Retain existing security checks:
     - Only Admins can approve (`/approve`) or return (`/return`) bookings.
     - Users can only modify/cancel their own bookings while they are in DRAFT or FOR_UPDATE status.
