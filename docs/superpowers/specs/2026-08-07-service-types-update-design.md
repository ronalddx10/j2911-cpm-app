# Design Specification — Service Types and Ingress/Egress Conditional Visibility

This design document outlines the changes to standardise the available Service Types and conditionally hide the Ingress/Egress time fields for non-catering services in the Booking Wizard and booking edit forms.

---

## 1. Service Types Catalog Update

The service types will be updated to the following:
- `Packed Meals (Delivery Only)`
- `Packed Meals (w/ Distribution)`
- `Food Tray (Delivery Only)`
- `Assisted Catering`
- `Full Catering`
- `VIP Catering`

### 1.1 Legacy Data Migration Strategy (in `seed.ts`)
To prevent foreign key constraints from failing due to existing orders, the seed script will:
1. Search for legacy service types.
2. If found, rename or map them to the new equivalent service types:
   - `'Packed Meal'` -> `'Packed Meals (Delivery Only)'`
   - `'Buffet Set-up'` -> `'Full Catering'`
   - `'Delivery Only'` -> `'Food Tray (Delivery Only)'`
3. Delete any unused legacy service types.
4. Insert the remaining new service types.

---

## 2. Conditional Visibility of Ingress/Egress Fields

- Ingress and egress setup/cleanup times are only relevant for service types involving onsite catering staff (e.g., `Assisted Catering`, `Full Catering`, `VIP Catering`).
- When a user selects a service type in either the Booking Wizard (`BookingWizardModal.tsx`) or the Order modifier form (`OrderViewClient.tsx`), we calculate:
  ```typescript
  const selectedServiceType = catalogs?.serviceTypes.find(st => st.id.toString() === serviceTypeId);
  const isCatering = selectedServiceType?.serviceName.toLowerCase().includes('catering') || false;
  ```
- If `isCatering` is true, show the Ingress/Egress inputs.
- If `isCatering` is false, hide the Ingress/Egress inputs. In the submit payload, send `null` for both `ingressTime` and `egressTime`.

---

## 3. Verification Plan

1. **Verify Database Seeding**:
   - Run `npm run db:seed`. Verify that only the 6 new service types exist in the `d_cpm_service_types` table.
2. **Verify Conditionally Hidden Fields in Wizard**:
   - In the Booking Wizard, select `Food Tray (Delivery Only)`. Verify that Ingress/Egress time input fields are hidden.
   - Select `Full Catering`. Verify that Ingress/Egress time input fields are visible.
3. **Verify Submit Payload**:
   - Create a draft order with a non-catering service type. Verify that it saves successfully and has `ingressTime: null` and `egressTime: null` in the database.
