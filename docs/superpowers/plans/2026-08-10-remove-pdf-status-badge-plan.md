# Remove PDF Status Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the status badge block and background card styling from the top header card in both `generateInvoicePDF` and `generateKitchenPDF`.

**Architecture:** Modify `src/lib/pdf.ts` to delete variables related to status color resolution and header-badge rendering instructions.

**Tech Stack:** Next.js, TypeScript

## Global Constraints

- Preserve all existing comments and docstrings.
- Maintain formatting, snake_case for DB fields, and camelCase for API/variables.
- Ensure type-safety compiles cleanly with 0 errors via `npx tsc --noEmit`.

---

### Task 1: Remove status badge rendering in pdf.ts

**Files:**
- Modify: `src/lib/pdf.ts`

- [ ] **Step 1: Remove status badge in generateInvoicePDF**
  In `src/lib/pdf.ts`, inside `generateInvoicePDF`:
  - Delete `statusName`, `statusText`, `textWidth`, `badgeX`, `badgeWidth`, `textX`, `badgeBgColor`, `badgeTextColor` variable resolution blocks.
  - Inside `buildHeader`, delete the badge color and rectangle instructions:
    ```typescript
    // Delete:
    `${badgeBgColor}`,
    `440 695 100 18 re f`,
    ```
  - Inside `buildHeader`, delete the badge text block:
    ```typescript
    // Delete:
    `BT`,
    `/F2 9 Tf`,
    `${badgeTextColor}`,
    `${textX} 701 Td`,
    `(${statusText}) Tj`,
    `ET`,
    ```

- [ ] **Step 2: Remove status badge in generateKitchenPDF**
  In `src/lib/pdf.ts`, inside `generateKitchenPDF`:
  - Perform the exact same deletions for badge variable definitions, backgrounds, and text blocks.

---

### Task 2: Verification & Build Check

- [ ] **Step 1: Compile TypeScript checks**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation with 0 errors.

- [ ] **Step 2: Compile Next.js production build**
  Run: `npm run build`
  Expected: Clean compilation with 0 errors.
