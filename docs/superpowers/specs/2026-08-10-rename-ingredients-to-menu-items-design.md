# Rename Ingredients to Menu Items Design Spec

## 1. Goal
Rename all tab headers, page headers, and helper descriptions referencing "Food Ingredients" or "Ingredient Ledger" in the Operational Catalog to "Menu Items" / "Menu Item Ledger".

---

## 2. Component Design & Changes

### A. Catalog Manager UI (`src/components/CatalogManager.tsx`)
1. **Tab Selector**:
   - Change label from "Food Ingredients" to "Menu Items" (around line 227).
2. **Sub-tab Header**:
   - Change header text from "Dish & Ingredient Ledger" to "Menu Item Ledger" (around line 326).
3. **Menu Packages empty ingredients helper text**:
   - Change the helper message from `No dishes registered. Register them in "Food Ingredients" tab first.` to `No dishes registered. Register them in "Menu Items" tab first.` (around line 424).
