# Rename Ingredients to Menu Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename user-facing labels referencing "Food Ingredients" and "Ingredient Ledger" to "Menu Items" / "Menu Item Ledger" in the Catalog Manager interface.

**Architecture:** Modify `src/components/CatalogManager.tsx` strings.

**Tech Stack:** Next.js, React, TypeScript

## Global Constraints

- Preserve all existing comments and docstrings.
- Maintain formatting, snake_case for DB fields, and camelCase for API/variables.
- Ensure type-safety compiles cleanly with 0 errors via `npx tsc --noEmit`.

---

### Task 1: Rename Food Ingredients and Ingredient Ledger in CatalogManager.tsx

**Files:**
- Modify: `src/components/CatalogManager.tsx`

- [ ] **Step 1: Rename subtab button label**
  Change line 227 to:
  `<ListPlus className="w-4 h-4 mr-2" /> Menu Items`

- [ ] **Step 2: Rename subtab main heading**
  Change line 326 to:
  `<h2 className="text-xl font-bold text-slate-900 dark:text-white">Menu Item Ledger</h2>`

- [ ] **Step 3: Rename empty package dish warning helper text**
  Change line 424 to:
  `<p className="text-xs text-slate-500 text-center py-4">No dishes registered. Register them in "Menu Items" tab first.</p>`

---

### Task 2: Verification & Build Check

- [ ] **Step 1: Compile TypeScript checks**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation with 0 errors.

- [ ] **Step 2: Compile Next.js production build**
  Run: `npm run build`
  Expected: Clean compilation with 0 errors.
