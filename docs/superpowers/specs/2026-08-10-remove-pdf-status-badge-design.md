# Remove Status Badge from PDFs Design Spec

## 1. Goal
Remove the status badge from both Invoice and Kitchen PDF headers, since PDFs are only downloadable/printable once approved, making the status badge redundant and prone to displaying stale state.

---

## 2. Component Design & Changes

### A. PDF Output Layout (`src/lib/pdf.ts`)
1. **Invoice PDF (`generateInvoicePDF`)**:
   - Remove the status-related badge variable resolutions (lines 44–64 in [`pdf.ts`](file:///home/ronald/projects/cpm/src/lib/pdf.ts)).
   - In `buildHeader`, remove the status badge background rectangle and the status text `BT` block:
     ```diff
     - `${badgeBgColor}`,
     - `440 695 100 18 re f`,
     ...
     - // 3. Text block for Badge Text
     - `BT`,
     - `/F2 9 Tf`,
     - `${badgeTextColor}`,
     - `${textX} 701 Td`,
     - `(${statusText}) Tj`,
     - `ET`,
     ```
2. **Kitchen PDF (`generateKitchenPDF`)**:
   - Apply the same deletions to `generateKitchenPDF`.
