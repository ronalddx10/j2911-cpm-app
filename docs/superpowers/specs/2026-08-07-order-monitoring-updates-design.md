# Design Specification — CPM Order Monitoring System Updates

This design document outlines the changes required to update order forms (line item layout and add/edit input ordering) and introduce an administrator override function to directly submit and approve draft bookings.

---

## 1. Objectives & Requirements

1. **Table Column Restructuring (Forms)**
   - In both the order creation wizard and edit/update order forms, the line item summary table columns will display the **Service Time** column in between the **Period** (Meal Period) and the **Item** (Order Menu/Package Name) columns.

2. **Add/Edit Line Item Fields Ordering**
   - The inputs for adding or editing a single line item will follow this visual sequence:
     1. **Package / Menu** (Order Item)
     2. **Service Time**
     3. **Period** (Meal Period)
     4. **Rate / Pax**
     5. **Pax**

3. **Admin Submit & Approve Override**
   - Administrators will have a "Submit & Approve" action button when viewing a booking request in `DRAFT` or `FOR_UPDATE` state.
   - When clicked, this action will transition the order directly to `APPROVED`, generate the invoice PDF, and create an appropriate ledger entry in the order's history.

---

## 2. Technical Details & Component Updates

### 2.1 Backend Changes (`/api/orders/[id]/approve/route.ts`)
- Update the status check to accept `DRAFT` and `FOR_UPDATE` status values:
  ```typescript
  const currentStatus = order.status.statusName;
  if (currentStatus !== 'PENDING_APPROVAL' && currentStatus !== 'DRAFT' && currentStatus !== 'FOR_UPDATE') {
    return NextResponse.json(
      { success: false, error: { message: 'Only orders pending review or in draft status can be approved.' } },
      { status: 400 }
    );
  }
  ```
- Customize history ledger remarks based on whether it was a standard approval or an override:
  ```typescript
  const remarks = currentStatus === 'PENDING_APPROVAL'
    ? 'Order approved. Invoice PDF successfully generated.'
    : 'Order submitted and approved via administrator override.';
  ```

### 2.2 Frontend UI Component Changes

#### `OrderViewClient.tsx` (Booking modifier form & details view)
- **Line items summary table (edit mode)**:
  - Add `<th className="px-4 py-2 font-semibold">Service Time</th>` after `Period` and before `Item`.
  - In `tbody`, remove service time display from the `Period` cell, and output `{meal.serviceTime || '—'}` in its own cell between the two.
- **Add/edit line item fields**:
  - Re-order the grid fields to display: Package/Menu, Service Time, Period, Rate/Pax, Pax.
- **Admin action section**:
  - When `order.status.statusName` is `DRAFT` or `FOR_UPDATE` and `user.role` is `ADMIN`, show a button for "Submit & Approve" next to "Cancel Booking".
  - This button triggers `handleOrderAction('approve')`.

#### `BookingWizardModal.tsx` (New booking creation wizard)
- **Line items summary table**:
  - Insert `<th className="px-4 py-2 font-semibold">Service Time</th>` after `Period` and before `Item`.
  - Add a dedicated `<td className="px-4 py-3 text-slate-900 dark:text-slate-100">{meal.serviceTime || '—'}</td>` cell.
- **Add/edit line item fields**:
  - Re-order the fields to: Package/Menu, Service Time, Period, Rate/Pax, Pax.

#### `OrderDetailDrawer.tsx` (Dashboard order preview drawer)
- **Admin actions**:
  - Show a "Submit & Approve" button when `user.role === 'ADMIN'` and the order status is `DRAFT` or `FOR_UPDATE`.
  - When clicked, it confirms the override and calls `handleOrderAction('approve', selectedOrder.id)`.

---

## 3. Verification Plan

1. **Verify Table Columns in Create & Edit Forms**
   - Open Booking Wizard (create order) and order details edit view. Check that Service Time is displayed between Period and Item.
2. **Verify Inputs Order**
   - Click "Add Meal Period" or "Edit" on a line item and verify the inputs order: Package/Menu, Service Time, Period, Rate/Pax, Pax.
3. **Verify Admin Override Action**
   - Log in as `admin`.
   - Open a `DRAFT` order.
   - Click "Submit & Approve". Verify that status becomes `APPROVED`, invoice PDF is generated, and history ledger says "Order submitted and approved via administrator override."
