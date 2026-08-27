# Service Types and Ingress/Egress Visibility Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update seed data for the 6 requested service types (mapping/deleting legacy ones to avoid constraint failures) and implement conditional rendering of ingress/egress fields based on whether the selected service type is a catering type.

**Architecture:** Update `seed.ts` migration block. Add `isCatering` compute in React views and wrap ingress/egress inputs inside conditional templates. Ensure submission payloads pass `null` for non-catering services.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Drizzle ORM.

## Global Constraints

- Preserve all existing comments and docstrings.
- Ensure type consistency.
- Run `npm run build` to verify compiling.

---

### Task 1: Update Database Seeding for Service Types

**Files:**
- Modify: `src/lib/db/seed.ts`

- [ ] **Step 1: Update the seed script with new service types and legacy mapping**

  Modify `src/lib/db/seed.ts` (around lines 31-49) to first find any existing legacy service types, rename them to the new ones, delete any unreferenced legacy service types, and then seed the new list:
  ```typescript
  // 2. Seed Service Types
  const serviceTypesData = [
    { serviceName: 'Packed Meals (Delivery Only)' },
    { serviceName: 'Packed Meals (w/ Distribution)' },
    { serviceName: 'Food Tray (Delivery Only)' },
    { serviceName: 'Assisted Catering' },
    { serviceName: 'Full Catering' },
    { serviceName: 'VIP Catering' },
  ];

  // Map legacy names to new equivalents to prevent foreign key errors on existing orders
  const legacyMapping: Record<string, string> = {
    'Packed Meal': 'Packed Meals (Delivery Only)',
    'Buffet Set-up': 'Full Catering',
    'Delivery Only': 'Food Tray (Delivery Only)'
  };

  for (const [oldName, newName] of Object.entries(legacyMapping)) {
    const existingOld = await db.query.serviceTypes.findFirst({
      where: eq(schema.serviceTypes.serviceName, oldName),
    });
    if (existingOld) {
      // Check if new name already exists
      const existingNew = await db.query.serviceTypes.findFirst({
        where: eq(schema.serviceTypes.serviceName, newName),
      });
      if (!existingNew) {
        // Rename the old service type
        await db.update(schema.serviceTypes)
          .set({ serviceName: newName })
          .where(eq(schema.serviceTypes.id, existingOld.id));
      } else {
        // Map any orders referencing old to new, then delete old
        await db.update(schema.orders)
          .set({ serviceTypeId: existingNew.id })
          .where(eq(schema.orders.serviceTypeId, existingOld.id));
        await db.delete(schema.serviceTypes).where(eq(schema.serviceTypes.id, existingOld.id));
      }
    }
  }

  const serviceTypesList = [];
  for (const data of serviceTypesData) {
    let serviceType = await db.query.serviceTypes.findFirst({
      where: eq(schema.serviceTypes.serviceName, data.serviceName),
    });
    if (!serviceType) {
      const inserted = await db.insert(schema.serviceTypes).values(data).returning();
      serviceType = inserted[0];
    }
    serviceTypesList.push(serviceType);
  }
  console.log(`Seeded ${serviceTypesList.length} service types.`);
  ```

- [ ] **Step 2: Run seed script**

  Run: `npm run db:seed`
  Expected: Seed completes successfully.

- [ ] **Step 3: Commit changes**

  ```bash
  git add src/lib/db/seed.ts
  git commit -m "db: update service types seed data and legacy migrations"
  ```

---

### Task 2: Conditional Ingress/Egress in BookingWizardModal

**Files:**
- Modify: `src/components/BookingWizardModal.tsx`

- [ ] **Step 1: Calculate isCatering and wrap input fields**

  Modify `src/components/BookingWizardModal.tsx`:
  - Calculate `isCatering` near the top of the component or render function:
    ```typescript
    const selectedServiceType = catalogs?.serviceTypes.find(st => st.id.toString() === wizardServiceTypeId);
    const isCatering = selectedServiceType?.serviceName.toLowerCase().includes('catering') || false;
    ```
  - Wrap the Ingress/Egress form fields (around lines 445-468) in:
    ```tsx
    {isCatering && (
      <div className="grid grid-cols-2 gap-6">
         ...
      </div>
    )}
    ```
  - Adjust the submit payload (around lines 282-283):
    ```typescript
    ingressTime: isCatering ? (wizardIngressTime || null) : null,
    egressTime: isCatering ? (wizardEgressTime || null) : null,
    ```

- [ ] **Step 2: Run build to verify compiling**

  Run: `npm run build`
  Expected: Success.

- [ ] **Step 3: Commit changes**

  ```bash
  git add src/components/BookingWizardModal.tsx
  git commit -m "frontend: hide ingress/egress inputs for non-catering services in wizard"
  ```

---

### Task 3: Conditional Ingress/Egress in OrderViewClient

**Files:**
- Modify: `src/app/orders/[id]/OrderViewClient.tsx`

- [ ] **Step 1: Calculate isCatering and wrap input fields**

  Modify `src/app/orders/[id]/OrderViewClient.tsx`:
  - Calculate `isCatering` near the top of the render function:
    ```typescript
    const selectedServiceType = serviceTypes.find(st => st.id.toString() === serviceTypeId);
    const isCatering = selectedServiceType?.serviceName.toLowerCase().includes('catering') || false;
    ```
  - Wrap the Ingress/Egress form fields (around lines 473-494) in:
    ```tsx
    {isCatering && (
      <div className="grid grid-cols-2 gap-6">
         ...
      </div>
    )}
    ```
  - Adjust the save payload (around line 264):
    ```typescript
    ingressTime: isCatering ? (ingressTime || null) : null,
    egressTime: isCatering ? (egressTime || null) : null,
    ```

- [ ] **Step 2: Run build to verify compiling**

  Run: `npm run build`
  Expected: Success.

- [ ] **Step 3: Commit changes**

  ```bash
  git add src/app/orders/[id]/OrderViewClient.tsx
  git commit -m "frontend: hide ingress/egress inputs for non-catering services in modifier form"
  ```
