# Order Monitoring Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the order forms' line items summary table layout, reorder the add/edit fields sequence, and add an administrator override to submit and approve draft orders.

**Architecture:** Use unified POST endpoint `/api/orders/[id]/approve` to approve drafts and generate invoices under admin credentials. Reorder React component layout blocks and table columns to adjust sequence in form views.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Drizzle ORM.

## Global Constraints

- Preserve all existing comments and docstrings.
- Ensure type consistency across components.
- Run builds (`npm run build`) to verify TypeScript compilations.

---

### Task 1: Backend Approval Override Endpoint

**Files:**
- Modify: `src/app/api/orders/[id]/approve/route.ts`

**Interfaces:**
- Consumes: Standard HTTP POST requests to `/api/orders/[id]/approve`.
- Produces: JSON response with the approved order details and generated PDF path, or an error.

- [ ] **Step 1: Modify status checks and history ledger remarks**

  Modify `/api/orders/[id]/approve/route.ts` starting at line 74:
  ```typescript
  const currentStatus = order.status.statusName;
  if (currentStatus !== 'PENDING_APPROVAL' && currentStatus !== 'DRAFT' && currentStatus !== 'FOR_UPDATE') {
    return NextResponse.json(
      { success: false, error: { message: 'Only orders pending review or in draft status can be approved.' } },
      { status: 400 }
    );
  }
  ```
  And update the history insertion remarks (around line 106):
  ```typescript
  await tx.insert(schema.orderHistory).values({
    orderId: order.id,
    fromStatusId: order.statusId,
    toStatusId: approvedStatus.id,
    changedByUserId: BigInt(userId),
    remarks: currentStatus === 'PENDING_APPROVAL'
      ? 'Order approved. Invoice PDF successfully generated.'
      : 'Order submitted and approved via administrator override.',
  });
  ```

- [ ] **Step 2: Run build to verify compiling**

  Run: `npm run build`
  Expected: Build succeeds or at least routes compile without type errors in `src/app/api/orders/[id]/approve/route.ts`.

- [ ] **Step 3: Commit changes**

  ```bash
  git add src/app/api/orders/[id]/approve/route.ts
  git commit -m "backend: update approve route to support admin draft override"
  ```

---

### Task 2: Update OrderViewClient (Modifier Table and Inputs)

**Files:**
- Modify: `src/app/orders/[id]/OrderViewClient.tsx`

- [ ] **Step 1: Restructure the line items summary table layout**

  Modify `src/app/orders/[id]/OrderViewClient.tsx` (around lines 565-620):
  - In `thead`, add `Service Time` between `Period` and `Item`:
    ```tsx
    <th className="px-4 py-2 font-semibold">Period</th>
    <th className="px-4 py-2 font-semibold">Service Time</th>
    <th className="px-4 py-2 font-semibold">Item</th>
    ```
  - In `tbody`, remove `{meal.serviceTime && <span className="block text-xs text-slate-500">{meal.serviceTime}</span>}` from the `Period` cell.
  - Insert a new `td` cell for the Service Time column:
    ```tsx
    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{meal.mealPeriod}</td>
    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{meal.serviceTime || '—'}</td>
    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{itemName}</td>
    ```

- [ ] **Step 2: Re-arrange input fields in the add/edit form**

  Modify the inputs order in the form container (around lines 632-694):
  - Re-order the elements so that they render: Package/Menu (`draftMenuId`), Service Time (`draftServiceTime`), Period (`draftMealPeriod`), Rate/Pax (`draftRate`), Pax (`draftPax`).
  - Make sure Tailwind classes are balanced correctly (e.g. adjust width classes if needed).

- [ ] **Step 3: Add "Submit & Approve" override button**

  Add the override button under the DRAFT/FOR_UPDATE action block (around lines 1013-1040):
  ```tsx
  {user.role === 'ADMIN' && (
    <button
      onClick={() => {
        if (confirm('Are you sure you want to override and approve this draft order?')) {
          handleOrderAction('approve');
        }
      }}
      disabled={actionLoading}
      className="w-full py-2.5 px-4 bg-blue-650 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center justify-center transition-all cursor-pointer"
    >
      {actionLoading ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />} Submit & Approve
    </button>
  )}
  ```

- [ ] **Step 4: Verify compiling**

  Run: `npm run build`
  Expected: Success.

- [ ] **Step 5: Commit changes**

  ```bash
  git add src/app/orders/[id]/OrderViewClient.tsx
  git commit -m "frontend: update OrderViewClient table columns, input sequence and add override button"
  ```

---

### Task 3: Update BookingWizardModal (New Order Table and Inputs)

**Files:**
- Modify: `src/components/BookingWizardModal.tsx`

- [ ] **Step 1: Restructure the line items summary table layout**

  Modify `src/components/BookingWizardModal.tsx` (around lines 538-582):
  - Add `Service Time` to header:
    ```tsx
    <th className="px-4 py-2 font-semibold">Period</th>
    <th className="px-4 py-2 font-semibold">Service Time</th>
    <th className="px-4 py-2 font-semibold">Item</th>
    ```
  - Add service time td cell:
    ```tsx
    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{meal.mealPeriod}</td>
    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{meal.serviceTime || '—'}</td>
    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{itemName}</td>
    ```

- [ ] **Step 2: Re-arrange input fields in the add/edit form**

  Modify the inputs order in the form container (around lines 593-655):
  - Re-order the elements so that they render: Package/Menu (`draftMenuId`), Service Time (`draftServiceTime`), Period (`draftMealPeriod`), Rate/Pax (`draftRate`), Pax (`draftPax`).

- [ ] **Step 3: Verify compiling**

  Run: `npm run build`
  Expected: Success.

- [ ] **Step 4: Commit changes**

  ```bash
  git add src/components/BookingWizardModal.tsx
  git commit -m "frontend: update BookingWizardModal table columns and input sequence"
  ```

---

### Task 4: Add Override Action to OrderDetailDrawer

**Files:**
- Modify: `src/components/OrderDetailDrawer.tsx`

- [ ] **Step 1: Add "Submit & Approve" button for admin on draft orders**

  Modify `src/components/OrderDetailDrawer.tsx` to add admin actions for DRAFT/FOR_UPDATE status around line 300:
  ```tsx
  {user?.role === 'ADMIN' && (selectedOrder.status.statusName === 'DRAFT' || selectedOrder.status.statusName === 'FOR_UPDATE') && !remarksActionType && (
    <div className="flex gap-2">
      <button
        onClick={() => {
          if (confirm('Are you sure you want to override and approve this draft order?')) {
            handleOrderAction('approve', selectedOrder.id);
          }
        }}
        disabled={!!actionLoading}
        className="py-2 px-4 bg-blue-650 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center transition-all"
      >
        {actionLoading === 'approve' ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />} Submit & Approve
      </button>
      <button
        onClick={() => onEdit(selectedOrder)}
        disabled={!!actionLoading}
        className="py-2 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold transition-all"
      >
        <FileEdit className="w-4 h-4 mr-1.5 inline" /> Edit Booking
      </button>
    </div>
  )}
  ```

- [ ] **Step 2: Verify compiling**

  Run: `npm run build`
  Expected: Success.

- [ ] **Step 3: Commit changes**

  ```bash
  git add src/components/OrderDetailDrawer.tsx
  git commit -m "frontend: add admin submit & approve button to OrderDetailDrawer"
  ```
