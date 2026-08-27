# PDF Layout and User Permissions Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement HTML-matching table column layout in PDFs, update day formatting to "Day X of Y", update PDF metadata to display venue/address, and open read/download access of all orders to all users.

**Architecture:** Update `pdf.ts` custom font loops and drawing coordinates. Remove created-by ID validation gates in API GET endpoints. Update day headings conditional ternary checks in React components.

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
- Produces: Correctly aligned layout streams.

- [ ] **Step 1: Update metadata rows in generateInvoicePDF**
  In `src/lib/pdf.ts`, rewrite the `buildHeader` inside `generateInvoicePDF` to display Venue name and Address, and include Special Instructions:
  ```typescript
    const buildHeader = (pageIndex: number, total: number) => {
      const venueName = order.venue?.venueName || 'Custom Delivery Location';
      const address = order.venue ? order.venue.physicalAddress : (order.customDeliveryAddress || 'N/A');
      const specialInstructions = order.specialInstructions || 'None';

      const escapedClient = escapePDFText(clientName);
      const escapedVenue = escapePDFText(venueName);
      const escapedAddress = escapePDFText(address);
      const escapedService = escapePDFText(order.serviceType.serviceName);
      const escapedInstructions = escapePDFText(specialInstructions);

      return [
        `BT`,
        `/F1 16 Tf`,
        `50 740 Td`,
        `(CPM ORDER MONITORING SYSTEM - INVOICE) Tj`,
        `/F1 11 Tf`,
        `0 -25 Td`,
        `(Invoice Number: INV-2026-${order.id}) Tj`,
        `0 -18 Td`,
        `(Client: ${escapedClient}  |  Mobile: ${escapePDFText(order.client?.phone || 'N/A')}) Tj`,
        `0 -15 Td`,
        `(Event Venue: ${escapedVenue}  |  Delivery Address: ${escapedAddress}) Tj`,
        `0 -15 Td`,
        `(Service Type: ${escapedService}  |  Ingress: ${ingressStr}  |  Egress: ${egressStr}) Tj`,
        `0 -15 Td`,
        `(Special Instructions: ${escapedInstructions}) Tj`,
        `0 -18 Td`,
        `(--------------------------------------------------------------------------) Tj`
      ];
    };
  ```

- [ ] **Step 2: Update metadata rows in generateKitchenPDF**
  In `src/lib/pdf.ts`, apply similar adjustments to `buildHeader` inside `generateKitchenPDF`:
  ```typescript
    const buildHeader = (pageIndex: number, total: number) => {
      const venueName = order.venue?.venueName || 'Custom Delivery Location';
      const address = order.venue ? order.venue.physicalAddress : (order.customDeliveryAddress || 'N/A');
      const specialInstructions = order.specialInstructions || 'None';

      const escapedClient = escapePDFText(clientName.trim() || 'N/A');
      const escapedVenue = escapePDFText(venueName);
      const escapedAddress = escapePDFText(address);
      const escapedInstructions = escapePDFText(specialInstructions);

      return [
        `BT`,
        `/F1 16 Tf`,
        `50 740 Td`,
        `(CPM KITCHEN PRODUCTION ORDER) Tj`,
        `/F1 11 Tf`,
        `0 -25 Td`,
        `(Order ID / Invoice No: INV-2026-${order.id}) Tj`,
        `0 -18 Td`,
        `(Client: ${escapedClient}  |  Mobile: ${escapePDFText(order.client?.phone || 'N/A')}) Tj`,
        `0 -15 Td`,
        `(Event Venue: ${escapedVenue}  |  Delivery Address: ${escapedAddress}) Tj`,
        `0 -15 Td`,
        `(Special Instructions: ${escapedInstructions}) Tj`,
        `0 -18 Td`,
        `(--------------------------------------------------------------------------) Tj`
      ];
    };
  ```

- [ ] **Step 3: Update Day Label and Tabular Columns inside generateInvoicePDF**
  In `generateInvoicePDF`, format day label based on `totalPages > 1` (use `Day X of Y` vs `Day 1`). Group meals by `mealPeriod` and draw aligned text chunks using hardcoded X displacements:
  ```typescript
      const dayHeading = totalPages > 1 
        ? `Day ${pageNum} of ${totalPages}: ${escapePDFText(formattedDate)}`
        : `Day 1: ${escapePDFText(formattedDate)}`;

      const dayLines = [
        ...buildHeader(pageNum, totalPages),
        `0 -25 Td`,
        `/F1 13 Tf`,
        `(${dayHeading}) Tj`,
        `0 -20 Td`,
        `/F1 11 Tf`
      ];

      // Group meals by mealPeriod
      const groupedMeals = (day.mealPeriods || []).reduce((acc: any, meal: any) => {
        const period = meal.mealPeriod || 'Other';
        if (!acc[period]) acc[period] = [];
        acc[period].push(meal);
        return acc;
      }, {});

      Object.entries(groupedMeals).forEach(([period, meals]: [string, any]) => {
        dayLines.push(`0 -20 Td`);
        dayLines.push(`/F1 11 Tf`);
        dayLines.push(`(${escapePDFText(period)}) Tj`); // Group header
        dayLines.push(`0 -15 Td`);

        meals.forEach((meal: any) => {
          const menuTitle = meal.customName || meal.menu?.title || 'Custom Combo';
          const baseRate = Number(meal.rate || 0);
          const subtotal = baseRate * meal.pax;
          daySubtotal += subtotal;

          const serviceTimeVal = meal.serviceTime ? formatTime(meal.serviceTime) : 'N/A';
          const titleStr = `${menuTitle} @ ${serviceTimeVal}`;
          
          const itemsList = meal.mealPeriodItems && meal.mealPeriodItems.length > 0
            ? meal.mealPeriodItems.map((i: any) => i.item?.itemName).filter(Boolean)
            : (meal.menu?.menuItems?.map((i: any) => i.item?.itemName).filter(Boolean) || []);
          const itemsText = `Items: ${itemsList.join(', ')}`;

          // Draw Col 1 (Details & Items)
          dayLines.push(`0 -15 Td`);
          dayLines.push(`/F1 10 Tf`);
          dayLines.push(`(${escapePDFText(titleStr)}) Tj`);
          
          // Draw Col 2 (Rate) - relative X displacement to 320 (370 from origin 50)
          dayLines.push(`320 0 Td`);
          dayLines.push(`(PHP ${baseRate.toFixed(2)}) Tj`);
          
          // Draw Col 3 (Pax) - relative X displacement to 80 (450 from origin 50)
          dayLines.push(`80 0 Td`);
          dayLines.push(`(${meal.pax} Pax) Tj`);
          
          // Draw Col 4 (Subtotal) - relative X displacement to 60 (510 from origin 50)
          dayLines.push(`60 0 Td`);
          dayLines.push(`(PHP ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}) Tj`);

          // Restore cursor to X=50, and move down for items list
          dayLines.push(`-460 -12 Td`);
          dayLines.push(`/F1 9 Tf`);
          dayLines.push(`(${escapePDFText(itemsText)}) Tj`);
        });
      });
  ```

- [ ] **Step 4: Update Day Label and Grouping layout inside generateKitchenPDF**
  Perform similar grouping and page layout modifications inside `generateKitchenPDF`:
  ```typescript
      const dayHeading = totalPages > 1 
        ? `Day ${pageNum} of ${totalPages}: ${escapePDFText(formattedDate)}`
        : `Day 1: ${escapePDFText(formattedDate)}`;

      const dayLines = [
        ...buildHeader(pageNum, totalPages),
        `0 -25 Td`,
        `/F1 13 Tf`,
        `(${dayHeading}) Tj`,
        `0 -20 Td`,
        `/F1 11 Tf`
      ];

      const groupedMeals = (day.mealPeriods || []).reduce((acc: any, meal: any) => {
        const period = meal.mealPeriod || 'Other';
        if (!acc[period]) acc[period] = [];
        acc[period].push(meal);
        return acc;
      }, {});

      Object.entries(groupedMeals).forEach(([period, meals]: [string, any]) => {
        dayLines.push(`0 -20 Td`);
        dayLines.push(`/F1 11 Tf`);
        dayLines.push(`(${escapePDFText(period)}) Tj`);
        dayLines.push(`0 -15 Td`);

        meals.forEach((meal: any) => {
          const menuTitle = meal.customName || meal.menu?.title || 'Custom Combo';
          const serviceTimeStr = meal.serviceTime ? formatTime(meal.serviceTime) : 'N/A';
          const titleStr = `${menuTitle} @ ${serviceTimeStr}`;
          
          const itemsList = meal.mealPeriodItems && meal.mealPeriodItems.length > 0
            ? meal.mealPeriodItems.map((i: any) => i.item?.itemName).filter(Boolean)
            : (meal.menu?.menuItems?.map((i: any) => i.item?.itemName).filter(Boolean) || []);
          const itemsText = `Items: ${itemsList.join(', ')}`;

          dayLines.push(`0 -15 Td`);
          dayLines.push(`/F1 10 Tf`);
          dayLines.push(`(${escapePDFText(titleStr)}) Tj`);
          
          // Move to Pax column (X=450, relative shift 400)
          dayLines.push(`400 0 Td`);
          dayLines.push(`(${meal.pax} Pax) Tj`);

          // Restore cursor and move down for items list
          dayLines.push(`-400 -12 Td`);
          dayLines.push(`/F1 9 Tf`);
          dayLines.push(`(${escapePDFText(itemsText)}) Tj`);
        });
      });
  ```

---

### Task 2: RLS and Permissions API Updates

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts`
- Modify: `src/app/api/orders/[id]/pdf/route.ts`
- Modify: `src/app/api/orders/[id]/kitchen-pdf/route.ts`

**Interfaces:**
- Consumes: Header request data.
- Produces: Unfiltered GET query payloads.

- [ ] **Step 1: Open GET list access to all users**
  In `src/app/api/orders/route.ts` (GET handler), remove the `role !== 'ADMIN'` RLS creator filter. Let `whereClause` only default to status filters if specified.

- [ ] **Step 2: Open GET order detail access to all users**
  In `src/app/api/orders/[id]/route.ts` (GET handler), remove the creator validation:
  ```typescript
    // Remove or comment out this block:
    /*
    if (role !== 'ADMIN' && order.createdByUserId !== BigInt(userId)) {
      ...
    }
    */
  ```

- [ ] **Step 3: Allow any user to download/print Invoice PDF**
  In `src/app/api/orders/[id]/pdf/route.ts`, remove the authorizer block:
  ```typescript
    // Remove this check:
    /*
    if (role !== 'ADMIN' && order.createdByUserId !== BigInt(userId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Not authorized...' } },
        { status: 403 }
      );
    }
    */
  ```

- [ ] **Step 4: Allow any user to download/print Kitchen PDF**
  In `src/app/api/orders/[id]/kitchen-pdf/route.ts`, remove the corresponding RLS check block.

---

### Task 3: Frontend Catering Schedule Day Headings

**Files:**
- Modify: `src/app/orders/[id]/OrderViewClient.tsx`

- [ ] **Step 1: Update Applied Catering Schedule day label**
  In `src/app/orders/[id]/OrderViewClient.tsx` (around lines 931-934), conditionally render the day heading:
  ```tsx
                      <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center mb-2">
                        <Calendar className="w-4 h-4 mr-1.5 text-blue-600 dark:text-sky-400" />
                        {order.orderDays.length > 1
                          ? `Day ${idx + 1} of ${order.orderDays.length}: `
                          : 'Day 1: '}
                        {new Date(day.eventDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
  ```

---

### Task 4: Verification & Build Check

- [ ] **Step 1: Run TypeScript compiler validation**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation with 0 errors.

- [ ] **Step 2: Run Next.js production build compilation**
  Run: `npm run build`
  Expected: Clean compilation with 0 errors.
