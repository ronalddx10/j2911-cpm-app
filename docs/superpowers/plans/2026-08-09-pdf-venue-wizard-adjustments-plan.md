# PDF, Venue, and Line Item Form Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement PDF layout updates, dynamic venue auto-suggestions with native HTML `<datalist>` matching and catalog insertion, and line item form reordering.

**Architecture:** Update `pdf.ts` coordinate operations and item loops. Integrate datalist components on frontend forms and update API POST/PUT handlers to dynamically create new venues if not found in catalog. Reorder JSX layout blocks in editor components.

**Tech Stack:** Next.js, React, Drizzle ORM, PostgreSQL

## Global Constraints

- Preserve all existing comments and docstrings.
- Maintain formatting, snake_case for DB fields, and camelCase for API/variables.
- Ensure type-safety compiles cleanly with 0 errors via `npx tsc --noEmit`.

---

### Task 1: PDF Layout Formatting Updates

**Files:**
- Modify: `src/lib/pdf.ts`

**Interfaces:**
- Consumes: `order` object.
- Produces: Correctly compiled multi-page PDFs with footer page counts, client mobile numbers, and standardized item lines.

- [ ] **Step 1: Update client mobile display and page numbering position in generateInvoicePDF**
  In `src/lib/pdf.ts`, modify `generateInvoicePDF`'s `buildHeader` function to remove page numbers, display mobile phone, and update relative positioning offsets:
  ```typescript
    const buildHeader = (pageIndex: number, total: number) => {
      return [
        `BT`,
        `/F1 16 Tf`,
        `50 740 Td`,
        `(CPM ORDER MONITORING SYSTEM - INVOICE) Tj`,
        `/F1 11 Tf`,
        `0 -25 Td`, // Relocate to next metadata row directly
        `(Invoice Number: INV-2026-${order.id}) Tj`,
        `0 -18 Td`,
        `(Client: ${escapedClient}  |  Mobile: ${escapePDFText(order.client?.phone || 'N/A')}) Tj`, // Mobile phone added
        `0 -15 Td`,
        `(Delivery Address: ${escapedAddress}) Tj`,
        `0 -15 Td`,
        `(Service Type: ${escapedService}  |  Ingress: ${ingressStr}  |  Egress: ${egressStr}) Tj`,
        `0 -18 Td`,
        `(--------------------------------------------------------------------------) Tj`
      ];
    };
  ```

- [ ] **Step 2: Update page numbering position in generateKitchenPDF**
  In `src/lib/pdf.ts`, modify `generateKitchenPDF`'s `buildHeader` function:
  ```typescript
    const buildHeader = (pageIndex: number, total: number) => {
      return [
        `BT`,
        `/F1 16 Tf`,
        `50 740 Td`,
        `(CPM KITCHEN PRODUCTION ORDER) Tj`,
        `/F1 11 Tf`,
        `0 -25 Td`, // Relocate directly
        `(Order ID / Invoice No: INV-2026-${order.id}) Tj`,
        `0 -18 Td`,
        `(Client: ${escapedClient}  |  Mobile: ${escapePDFText(order.client?.phone || 'N/A')}) Tj`, // Mobile phone added
        `0 -15 Td`,
        `(Special Instructions: ${specialInstructions}) Tj`,
        `0 -18 Td`,
        `(--------------------------------------------------------------------------) Tj`
      ];
    };
  ```

- [ ] **Step 3: Standardize event day meal period and item formatting in generateInvoicePDF**
  In `src/lib/pdf.ts`, modify the daily meal period loops in `generateInvoicePDF`:
  ```typescript
        const baseRate = Number(meal.rate || 0);
        const subtotal = baseRate * meal.pax;
        daySubtotal += subtotal;

        const serviceTimeVal = meal.serviceTime ? formatTime(meal.serviceTime) : 'N/A';

        dayLines.push(`0 -20 Td`);
        dayLines.push(`(Meal Period: ${escapePDFText(meal.mealPeriod)} x ${meal.pax} pax \\(PHP ${baseRate.toFixed(2)}/pax\\)) Tj`);
        dayLines.push(`0 -14 Td`);
        dayLines.push(`(\\(Service Time: ${serviceTimeVal}\\)) Tj`);
        dayLines.push(`0 -14 Td`);
        dayLines.push(`(Order Items:) Tj`);
        
        const itemsList = meal.mealPeriodItems && meal.mealPeriodItems.length > 0
          ? meal.mealPeriodItems.map((i: any) => i.item?.itemName).filter(Boolean)
          : (meal.menu?.menuItems?.map((i: any) => i.item?.itemName).filter(Boolean) || []);
        
        itemsList.forEach((itemName: string) => {
          dayLines.push(`0 -12 Td`);
          dayLines.push(`(  ${escapePDFText(itemName)} x ${meal.pax}) Tj`);
          currentYOffset -= 12;
        });
        currentYOffset -= 48;
  ```

- [ ] **Step 4: Standardize event day meal period and item formatting in generateKitchenPDF**
  Perform the same updates in `generateKitchenPDF` for meals looping:
  ```typescript
        const serviceTimeStr = meal.serviceTime ? formatTime(meal.serviceTime) : 'N/A';

        dayLines.push(`0 -20 Td`);
        dayLines.push(`(Meal Period: ${escapePDFText(meal.mealPeriod)} x ${meal.pax} pax) Tj`);
        dayLines.push(`0 -14 Td`);
        dayLines.push(`(\\(Service Time: ${serviceTimeStr}\\)) Tj`);
        dayLines.push(`0 -14 Td`);
        dayLines.push(`(Order Items:) Tj`);
        
        const itemsList = meal.mealPeriodItems && meal.mealPeriodItems.length > 0
          ? meal.mealPeriodItems.map((i: any) => i.item?.itemName).filter(Boolean)
          : (meal.menu?.menuItems?.map((i: any) => i.item?.itemName).filter(Boolean) || []);
        
        itemsList.forEach((itemName: string) => {
          dayLines.push(`0 -12 Td`);
          dayLines.push(`(  ${escapePDFText(itemName)} x ${meal.pax}) Tj`);
        });
  ```

- [ ] **Step 5: Draw separate footer page number block in both generateInvoicePDF and generateKitchenPDF**
  At the end of the page generating loop for `generateInvoicePDF`, close the main text block and start a new block at the bottom center:
  ```typescript
      dayLines.push(`ET`);
      dayLines.push(`BT /F1 10 Tf 270 30 Td (Page ${pageNum} of ${totalPages}) Tj ET`);
      streams.push(dayLines.join('\n'));
  ```
  Perform the exact same footer block addition at the end of the loop in `generateKitchenPDF` (replacing the old `ET` and `CPM Kitchen Production Document` footer strings):
  ```typescript
      dayLines.push(`ET`);
      dayLines.push(`BT /F1 10 Tf 270 30 Td (Page ${pageNum} of ${totalPages}) Tj ET`);
      streams.push(dayLines.join('\n'));
  ```

---

### Task 2: Backend Venue Persistence API Handlers

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts`

**Interfaces:**
- Consumes: `venueName` (string | null) and `customDeliveryAddress` (string | null).
- Produces: Dynamically checks and inserts custom venues, resolving `venueId` for persistence.

- [ ] **Step 1: Add dynamic venue persistence helper on POST route**
  In `src/app/api/orders/route.ts`, extract `venueName` from `body`. If `venueName` is provided but no matching venue is found in `d_cpm_venues` (case-insensitive check), insert it. Use the retrieved/inserted ID as `dbVenueId`:
  ```typescript
      const {
        clientId,
        venueId,
        venueName, // Add this
        customDeliveryAddress,
        serviceTypeId,
        pax,
        ingressTime,
        egressTime,
        specialInstructions,
        orderDays,
      } = body;

      let dbVenueId: bigint | null = null;
      let dbDeliveryAddress: string | null = null;

      if (venueName && venueName.trim() !== '') {
        const cleanedName = venueName.trim();
        // Check if exists
        const existingVenue = await db.select().from(schema.venues).where(sql`lower(${schema.venues.venueName}) = lower(${cleanedName})`).limit(1);
        if (existingVenue.length > 0) {
          dbVenueId = existingVenue[0].id;
          dbDeliveryAddress = existingVenue[0].physicalAddress;
        } else {
          // Create new venue dynamically
          const newVenueAddress = customDeliveryAddress || '';
          const insertedVenues = await db.insert(schema.venues).values({
            venueName: cleanedName,
            capacity: 100, // Default capacity
            physicalAddress: newVenueAddress,
          }).returning();
          dbVenueId = insertedVenues[0].id;
          dbDeliveryAddress = insertedVenues[0].physicalAddress;
        }
      } else if (venueId) {
        if (!/^\d+$/.test(String(venueId))) {
          return NextResponse.json(
            { success: false, error: { message: 'Invalid venue ID format.' } },
            { status: 400 }
          );
        }
        const venueList = await db.select().from(schema.venues).where(eq(schema.venues.id, BigInt(venueId))).limit(1);
        if (venueList.length === 0) {
          return NextResponse.json(
            { success: false, error: { message: 'Selected venue does not exist.' } },
            { status: 400 }
          );
        }
        dbVenueId = BigInt(venueId);
        dbDeliveryAddress = venueList[0].physicalAddress;
      } else {
        if (!customDeliveryAddress || customDeliveryAddress.trim() === '') {
          return NextResponse.json(
            { success: false, error: { message: 'Delivery address is required.' } },
            { status: 400 }
          );
        }
        dbDeliveryAddress = customDeliveryAddress;
      }
  ```

- [ ] **Step 2: Update PUT handler to support dynamic venue persistence**
  Apply the exact same code modifications in `src/app/api/orders/[id]/route.ts` inside the PUT handler.

---

### Task 3: Expose Venue Selector and Auto-Suggestions in UI

**Files:**
- Modify: `src/components/BookingWizardModal.tsx`
- Modify: `src/app/orders/[id]/OrderViewClient.tsx`

**Interfaces:**
- Consumes: catalogs.venues.
- Produces: Venue inputs with datalist autocomplete suggestions.

- [ ] **Step 1: Replace select with text input and datalist in BookingWizardModal**
  In `src/components/BookingWizardModal.tsx`, change states to add `wizardVenueName`:
  ```typescript
  const [wizardVenueName, setWizardVenueName] = useState('');
  ```
  Initialize `wizardVenueName` in edit `useEffect` (around line 38):
  ```typescript
      if (editOrder) {
        setWizardClientId(editOrder.clientId);
        setWizardVenueId(editOrder.venueId || '');
        setWizardVenueName(editOrder.venue?.venueName || '');
  ```
  Update venue input field (Step 1 form area, around lines 447-468) to be an `<input>` with `<datalist>`:
  ```tsx
              <div>
                <label htmlFor="wizardVenueInput" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Event Venue / Location</label>
                <input
                  id="wizardVenueInput"
                  list="wizard-venues-datalist"
                  value={wizardVenueName}
                  onChange={(e) => {
                    const typedVal = e.target.value;
                    setWizardVenueName(typedVal);
                    const matchingVenue = catalogs?.venues.find(v => v.venueName.toLowerCase() === typedVal.toLowerCase());
                    if (matchingVenue) {
                      setWizardVenueId(matchingVenue.id);
                      setWizardCustomAddress(matchingVenue.physicalAddress);
                    } else {
                      setWizardVenueId('');
                    }
                  }}
                  placeholder="Type to search or enter new venue..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none font-sans"
                />
                <datalist id="wizard-venues-datalist">
                  {catalogs?.venues.map((v) => (
                    <option key={v.id} value={v.venueName} />
                  ))}
                </datalist>
              </div>
  ```
  Make the delivery address input field enabled/disabled based on `wizardVenueId` (which is only truthy for an existing matching venue):
  ```tsx
                <input
                  type="text"
                  id="wizardAddress"
                  value={wizardCustomAddress}
                  onChange={(e) => setWizardCustomAddress(e.target.value)}
                  required
                  disabled={!!wizardVenueId}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-955 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none disabled:bg-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-400"
                  placeholder={wizardVenueId ? "" : "Enter delivery address"}
                />
  ```
  Update payload to send `venueName` to backend:
  ```typescript
    const payload = {
      clientId: wizardClientId,
      venueId: wizardVenueId ? wizardVenueId : null,
      venueName: wizardVenueName || null,
      customDeliveryAddress: wizardCustomAddress,
      // ...
  ```

- [ ] **Step 2: Replace select with text input and datalist in OrderViewClient**
  Make the exact same modifications in `src/app/orders/[id]/OrderViewClient.tsx`. Add `venueName` state, bind it to input and `<datalist>`, and update validation/payload generation.

---

### Task 4: Add Line Item Form Field Reordering

**Files:**
- Modify: `src/components/BookingWizardModal.tsx`
- Modify: `src/app/orders/[id]/OrderViewClient.tsx`

**Interfaces:**
- Rearranges form layout JSX nodes.

- [ ] **Step 1: Reorder layout inputs in BookingWizardModal**
  In `src/components/BookingWizardModal.tsx` (around lines 638-705), move the JSX blocks so that the elements are displayed in the row in the following sequence:
  1. Period Select
  2. Service Time Input
  3. Package / Menu Select
  4. Rate / Pax Input
  5. Pax Input

- [ ] **Step 2: Reorder layout inputs in OrderViewClient**
  Perform the exact same reordering in `src/app/orders/[id]/OrderViewClient.tsx` (around lines 669-720).

---

### Task 5: Verification & Type Checks

- [ ] **Step 1: Compile TypeScript check**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation with 0 errors.

- [ ] **Step 2: Compile Next.js production build**
  Run: `npm run build`
  Expected: Clean compilation with 0 errors.
