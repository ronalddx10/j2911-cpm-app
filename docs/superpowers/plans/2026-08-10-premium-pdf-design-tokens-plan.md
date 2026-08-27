# Premium PDF Design Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Style both the Invoice PDF and Kitchen PDF using the project's design tokens (Primary Blue background cards, Slate texts, Status badges, and divider lines) by rewriting the stream formatting logic in `pdf.ts` to coordinate vector drawing commands and text blocks.

**Architecture:** Update `pdf.ts` to dynamically calculate Y-coordinates on the page and draw structural cards (`re f`), horizontal rules (`m l S`), colored texts, and badges.

**Tech Stack:** Next.js, TypeScript

## Global Constraints

- Preserve all existing comments and docstrings.
- Maintain formatting, snake_case for DB fields, and camelCase for API/variables.
- Ensure type-safety compiles cleanly with 0 errors via `npx tsc --noEmit`.

---

### Task 1: Premium Styling for Invoice PDF

**Files:**
- Modify: `src/lib/pdf.ts`

- [ ] **Step 1: Rewrite stream builder inside generateInvoicePDF**
  In `src/lib/pdf.ts`, update `generateInvoicePDF` to coordinate drawing of the Blue header card, Status badge, metadata details, grey day headers, meal period divider cards, and light bottom rows.
  - Ensure vector paint operators (e.g. `re f`, `S`) are executed outside `BT ... ET` text objects.
  - Set color spaces properly using `rg` and `RG`.

---

### Task 2: Premium Styling for Kitchen PDF

**Files:**
- Modify: `src/lib/pdf.ts`

- [ ] **Step 1: Rewrite stream builder inside generateKitchenPDF**
  Implement the matching card, header, day bar, and grouping divider styles inside `generateKitchenPDF`, omitting price/subtotal metrics.

---

### Task 3: Verification & Build Check

- [ ] **Step 1: Compile TypeScript checks**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation with 0 errors.

- [ ] **Step 2: Compile Next.js production build**
  Run: `npm run build`
  Expected: Clean compilation with 0 errors.
