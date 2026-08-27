# User Stories — CPM (Catering & Packed Meals) Order Monitoring System
**Project Code Name:** Project Itadakimasu  
**Document Version:** 1.0  
**Last Updated:** August 2026

---

## 1. Persona Definitions

| Persona | Role Title | Description & Primary Goals |
| :--- | :--- | :--- |
| **Staff / User** | Client / Sales Representative | Inputs catering orders, structures multi-day meal schedules, coordinates event dates, uploads Purchase Orders (PO) and Delivery Receipts (DR), and submits requests for approval. |
| **Operations Admin** | Catering Manager / System Administrator | Manages client and menu catalogs, reviews pending bookings, approves or returns orders with remarks, verifies uploaded documents, updates event status to Delivered/Completed/Paid, and oversees audit logs. |
| **Kitchen Lead** | Kitchen & Production Supervisor | Reviews daily meal schedules, ingress/egress timings, and ingredient/dish requirements via kitchen production slips. |
| **Finance Officer** | Billing & Accounts Specialist | Verifies signed delivery receipts, generates invoice PDFs, confirms billing amounts, and marks completed orders as Paid. |

---

## 2. Epic 1: Authentication & Role-Based Access Control

### US-1.1: Secure User Login
* **As a** registered system user (Staff or Admin),
* **I want to** log in securely using my username and password,
* **So that** I can access the system features appropriate to my role and protect sensitive client ordering data.
* **Acceptance Criteria**:
  1. Valid credentials set an `httpOnly` encrypted JWT cookie (12-hour session lifespan).
  2. Invalid credentials return a clear error without revealing whether the username exists.
  3. Authenticated state persists across browser page reloads.

### US-1.2: Role-Based Interface Customization
* **As a** system user,
* **I want to** see interface options and action buttons customized to my role (Staff vs. Admin),
* **So that** I am only presented with workflows and controls I am authorized to perform.
* **Acceptance Criteria**:
  1. Admins see "Submit & Approve", "Approve Booking", "Return for Update", "Mark as Paid", and document approval actions.
  2. Staff users see "Submit Request" and "Cancel Booking" for drafts.
  3. Unauthorized API requests return an HTTP 403 Forbidden response.

---

## 3. Epic 2: Client Profile & Organization Directory

### US-2.1: Multi-Type Client Registration
* **As a** Staff or Admin user,
* **I want to** register clients categorized as `Company/Organization`, `Government`, `Non-Profit`, or `Individual`,
* **So that** client data is properly structured and differentiated for corporate, institutional, and private catering services.
* **Acceptance Criteria**:
  1. Organization types (`COMPANY`, `GOVERNMENT`, `NON_PROFIT`) require an Organization/Agency Name and Primary Contact details.
  2. `INDIVIDUAL` client type requires First Name and Last Name.
  3. Email and phone number formats are validated before saving.

### US-2.2: Secondary Contact Management
* **As a** Staff or Admin user,
* **I want to** capture a Secondary Contact Person and Secondary Contact Number for organization clients,
* **So that** operational logistics can reach alternative coordinators during large events.
* **Acceptance Criteria**:
  1. Optional `secondaryContactName` and `secondaryContactPhone` fields are available for corporate, government, and non-profit clients.
  2. Secondary contact details display in client profile cards, order drawers, and generated PDF invoice headers.

---

## 4. Epic 3: Catalog & Menu Item Ledger

### US-3.1: Menu Items & Ingredients Management
* **As an** Operations Admin,
* **I want to** manage a centralized catalog of discrete menu items/ingredients with unit prices and categories,
* **So that** standard dishes (e.g., Breakfast, Lunch, Snacks, Dinner) can be dynamically assembled into catering packages.
* **Acceptance Criteria**:
  1. Items can be added, updated, or categorized (e.g., Breakfast, AM Snack, Lunch, PM Snack, Dinner).
  2. Base unit prices are specified with 2 decimal precision (`NUMERIC(10,2)`).

### US-3.2: Menu Package Catalogs
* **As an** Operations Admin,
* **I want to** create and maintain pre-packaged set menus bundling standard food items,
* **So that** sales staff can quickly select standardized meal packages during order booking.
* **Acceptance Criteria**:
  1. Menus store a title, description, base per-pax rate, and active status flag (`is_active`).
  2. Deactivating a menu soft-deletes it without breaking historical references on past orders.

---

## 5. Epic 4: Booking Wizard & Order Scheduling Engine

### US-4.1: Multi-Day Event Scheduling
* **As a** Staff or Admin user,
* **I want to** create orders spanning multiple discrete calendar days,
* **So that** multi-day conferences and seminars can be planned within a single consolidated booking.
* **Acceptance Criteria**:
  1. Users can add multiple distinct dates to an order.
  2. Duplicate calendar dates within the same order are prevented.
  3. Order schedule summary displays day sequence headings (e.g., "Day 1 of 3: October 12, 2026").

### US-4.2: Meal Period Allocation & Time Slots
* **As a** Staff or Admin user,
* **I want to** assign discrete meal periods (Breakfast, AM Snack, Lunch, PM Snack, Dinner) with specific serving times,
* **So that** kitchen and dispatch logistics know the exact delivery schedule.
* **Acceptance Criteria**:
  1. Multiple meal periods can be added per day.
  2. Service times can be assigned per meal period (e.g., "07:30", "12:00").
  3. Ingress (setup) and egress (cleanup) times can be specified for catering setups.

### US-4.3: Catering Event Name & Structured Address Breakdown
* **As a** Staff or Admin user,
* **I want to** enter an Event Name (for Catering) and structured delivery address fields (Unit, Floor, Building, Street No, Street Name, Landmark),
* **So that** couriers and delivery drivers have unambiguous location instructions.
* **Acceptance Criteria**:
  1. `eventName` is required for Catering service types (`Buffet Set-up`).
  2. Structured fields (`unitNumber`, `floorNumber`, `buildingName`, `streetNumber`, `streetName`, `landmark`) concatenate into a unified delivery string with live preview.
  3. Alternatively, pre-set venues can be selected from a search dropdown.

### US-4.4: Dynamic Custom Packages & Automated Cost Integrity
* **As a** Staff or Admin user,
* **I want to** create dynamic custom food packages by selecting multiple discrete items with automatic price rollups,
* **So that** custom catering menus are accurately priced without spreadsheet formula errors.
* **Acceptance Criteria**:
  1. Selecting items automatically calculates the total per-pax rate as the sum of item unit prices.
  2. Subtotals are computed as `pax * rate`.
  3. Grand Total sums all meal period subtotals across all event days automatically.

### US-4.5: Purchase Order (PO) Upload in Wizard
* **As a** Staff or Admin user,
* **I want to** upload a Purchase Order file directly during booking creation in Step 1,
* **So that** corporate verification documents are attached from the moment the order is initiated.
* **Acceptance Criteria**:
  1. File upload accepts PDF, PNG, JPG, DOC, and DOCX formats.
  2. Uploaded file is saved and attached to the newly created order record.

---

## 6. Epic 5: Order Lifecycle, Verification & Approval Workflow

### US-5.1: Submitting Drafts for Review
* **As a** Staff user,
* **I want to** submit a drafted order for review,
* **So that** operations managers can inspect the schedule and pricing before approving.
* **Acceptance Criteria**:
  1. Clicking "Submit Request" transitions status from `DRAFT` or `FOR_UPDATE` to `PENDING_APPROVAL`.
  2. State lock activates, preventing further staff modifications while under review.

### US-5.2: Admin Approval & Instant Invoice Generation
* **As an** Operations Admin,
* **I want to** review and approve orders (or use "Submit & Approve" directly for admin-created bookings),
* **So that** confirmed orders are locked and ready for kitchen preparation.
* **Acceptance Criteria**:
  1. Approving transitions status to `APPROVED`.
  2. Generates static print-ready PDF invoice and kitchen slips.
  3. Revisions are locked permanently unless returned by an Admin.

### US-5.3: Returning Orders with Guidance Remarks
* **As an** Operations Admin,
* **I want to** return an order for revisions with mandatory explanation remarks,
* **So that** the submitting staff member understands what needs adjustment.
* **Acceptance Criteria**:
  1. Returning requires an explanation string (remarks cannot be blank).
  2. Status transitions to `FOR_UPDATE` and unlocks edit mode for the submitting user.
  3. The return remarks and actor are logged in the revision history ledger.

### US-5.4: Document Verification & Operational Delivery
* **As a** Staff or Admin user,
* **I want to** upload Delivery Receipts (DR) and Signed Delivery Receipts to verify delivery and completion,
* **So that** the system reflects real-world operational execution and billing readiness.
* **Acceptance Criteria**:
  1. Uploading a Delivery Receipt supports marking status as `DELIVERED`.
  2. Uploading a Signed Delivery Receipt supports marking status as `COMPLETED` (Ready for Billing).
  3. Admins can review and approve individual uploaded attachments.

### US-5.5: Final Payment Settlement
* **As an** Operations Admin / Finance Officer,
* **I want to** acknowledge full payment for a completed order,
* **So that** the booking is finalized and closed.
* **Acceptance Criteria**:
  1. "Mark as PAID" is accessible to Admins for orders in `COMPLETED` status.
  2. Transitions status to `PAID` and displays a closed order badge.

### US-5.6: Order Cancellation with Audit Trail
* **As a** Staff or Admin user,
* **I want to** cancel an order with documented reasons,
* **So that** aborted bookings are archived without losing operational traceability.
* **Acceptance Criteria**:
  1. Requires a cancellation reason string for Admin cancellations.
  2. Status transitions to `CANCELLED` and locks the record.
  3. Reason is permanently recorded in `cpm_order_history`.

---

## 7. Epic 6: Reporting & Multi-Format PDF Outputs

### US-6.1: Branded Customer Invoice PDF
* **As a** system user,
* **I want to** download a clean, multi-page PDF invoice organized by event day,
* **So that** clients receive a professional, itemized billing summary.
* **Acceptance Criteria**:
  1. Each event day is rendered on a clean page with aligned columns (Rate, Pax, Subtotal).
  2. Header displays Client profile, Primary/Secondary contacts, Event Name, and Delivery Address.
  3. Styled with project design tokens (Brand Blue card headers, Slate text, light divider lines).

### US-6.2: Kitchen Production Slips
* **As a** Kitchen Supervisor,
* **I want to** generate a Kitchen PDF containing dishes, pax quantities, and serving times without pricing,
* **So that** kitchen preparation and dispatch teams have clear operational guidelines.
* **Acceptance Criteria**:
  1. Displays event date, meal period, service times, and discrete food items with pax headcounts.
  2. Excludes monetary rates, totals, and billing information.

### US-6.3: Landscape Order Monitoring Summary Report
* **As an** Operations Admin,
* **I want to** download a landscape PDF report matching the current filtered orders list,
* **So that** management has an overview of all scheduled orders without text overlapping.
* **Acceptance Criteria**:
  1. Generates in landscape orientation.
  2. Displays Pax headcount, Delivery Address with full word-wrapping, Date Span, Service Type, and Grand Total.
  3. Accurately reflects active search and status filter selections.
