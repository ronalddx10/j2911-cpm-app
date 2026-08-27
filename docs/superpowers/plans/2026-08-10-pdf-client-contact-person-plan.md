# PDF Client Contact Person Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include the company/organization contact person's name next to the organization name in the client metadata rows in both invoice and kitchen PDFs.

**Architecture:** Update `pdf.ts` `buildHeader` functions to conditionally format the client details row.

**Tech Stack:** Next.js, TypeScript

## Global Constraints

- Preserve all existing comments and docstrings.
- Maintain formatting, snake_case for DB fields, and camelCase for API/variables.
- Ensure type-safety compiles cleanly with 0 errors via `npx tsc --noEmit`.

---

### Task 1: Add organization contact person to PDF headers

**Files:**
- Modify: `src/lib/pdf.ts`

**Interfaces:**
- Consumes: `order` client data.
- Produces: Correctly formatted PDF metadata strings.

- [ ] **Step 1: Format client metadata row in generateInvoicePDF**
  In `src/lib/pdf.ts`, modify `generateInvoicePDF`'s `buildHeader` block to conditionally query and format contact person info:
  ```typescript
      let clientDetail = `Client: ${escapedClient}`;
      if (order.client.clientType === 'ORGANIZATION') {
        const contactName = `${order.client.firstName || ''} ${order.client.lastName || ''}`.trim();
        if (contactName) {
          clientDetail += `  |  Contact: ${escapePDFText(contactName)}`;
        }
      }
      clientDetail += `  |  Mobile: ${escapePDFText(order.client?.phone || 'N/A')}`;
  ```
  Replace the line inside the return array:
  ```typescript
  // Replace:
  // `(Client: ${escapedClient}  |  Mobile: ${escapePDFText(order.client?.phone || 'N/A')}) Tj`
  // With:
  `(${clientDetail}) Tj`
  ```

- [ ] **Step 2: Format client metadata row in generateKitchenPDF**
  In `src/lib/pdf.ts`, apply the exact same modifications inside `generateKitchenPDF`'s `buildHeader` block:
  ```typescript
      let clientDetail = `Client: ${escapedClient}`;
      if (order.client?.clientType === 'ORGANIZATION') {
        const contactName = `${order.client.firstName || ''} ${order.client.lastName || ''}`.trim();
        if (contactName) {
          clientDetail += `  |  Contact: ${escapePDFText(contactName)}`;
        }
      }
      clientDetail += `  |  Mobile: ${escapePDFText(order.client?.phone || 'N/A')}`;
  ```
  Replace the line inside the return array:
  ```typescript
  `(${clientDetail}) Tj`
  ```

---

### Task 2: Verification & Build Check

- [ ] **Step 1: Compile TypeScript checks**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation with 0 errors.

- [ ] **Step 2: Compile Next.js production build**
  Run: `npm run build`
  Expected: Clean compilation with 0 errors.
