# Premium PDF Design Tokens Styling Spec

## 1. Goal
Format both Invoice and Kitchen PDFs to match the styling, colors, and layout structure of the HTML order view page. Implement cards, table header headers, status badges, and borders using PDF vector drawing commands (`rg`, `RG`, `re`, `f`, `m`, `l`, `S`).

---

## 2. Visual Layout & Color Mappings

### Color Palette Mappings (PDF equivalent values)
- **Primary Brand Color** (Blue-600: `#2563eb`): `0.145 0.388 0.922 rg` (fill) / `RG` (stroke)
- **Primary Dark Text** (Slate-900: `#0f172a`): `0.059 0.090 0.165 rg`
- **Secondary Dark Text** (Slate-800: `#1e293b`): `0.118 0.161 0.231 rg`
- **Neutral Light Grey (Table Headers)** (Slate-100: `#f1f5f9`): `0.945 0.961 0.976 rg`
- **Neutral Light Border** (Slate-200: `#e2e8f0`): `0.886 0.910 0.941 RG` (stroke)
- **Status APPROVED Background** (Emerald-100: `#d1fae5`): `0.820 0.980 0.898 rg`
- **Status APPROVED Text** (Emerald-800: `#065f46`): `0.024 0.373 0.275 rg`

---

## 3. Component Details & Changes

### A. Invoice PDF Layout (`generateInvoicePDF`)
1. **Header Card Block**:
   - Draw a solid Blue-600 background card: `50 670 512 80 re f`.
   - Write the main document headers inside this card using white text (`1.0 1.0 1.0 rg`).
   - Draw a Status Badge inside the card at top-right (e.g. X=440, Y=695, width=100, height=18):
     - Background: Emerald-100
     - Text: `(APPROVED)` in Emerald-800 bold text.
2. **Metadata Fields Block**:
   - Starting at Y=645 down to Y=550:
     - Render Client information, Venue details, and Special Instructions.
     - Use Slate-800 (`0.118 0.161 0.231 rg`) for details.
   - At Y=545, draw a clean horizontal border line (Slate-200: `0.886 0.910 0.941 RG`, width 0.5):
     `0.5 w 50 545 m 562 545 l S`
3. **Catering Schedule Layout**:
   - **Event Day Header**:
     - For each event day, draw a light grey bar (Slate-100: `0.945 0.961 0.976 rg`) of height 20: `50 <Y> 512 20 re f`.
     - Write the day label (e.g. `Day 1 of 3: Date`) inside this bar in Slate-900 bold text.
   - **Meal Period Divider**:
     - For each meal period section, draw a light blue/grey bar (Slate-50: `0.973 0.980 0.988 rg`) of height 16: `50 <Y> 512 16 re f`.
     - Write the section header (e.g. `Breakfast`) inside it in Blue-600 brand text.
   - **Catering Meal Rows**:
     - Output row details in aligned columns:
       - **Col 1 (Menu Package Name & Items)**: X=60
         `(<itemName> @ <serviceTime>) Tj`
         Renders food items list in a sub-row: `(Items: <food items>) Tj` in Slate-600 text.
       - **Col 2 (Rate)**: X=370
         `(PHP <rate>) Tj`
       - **Col 3 (Pax)**: X=450
         `(<pax> Pax) Tj`
       - **Col 4 (Subtotal)**: X=510
         `(PHP <subtotal>) Tj`
     - After each row, draw a light divider stroke (width 0.3): `0.3 w 50 <Y> m 562 <Y> l S`.

### B. Kitchen PDF Layout (`generateKitchenPDF`)
- Apply the identical styled header block, metadata layout, status badge, grey day headers, and meal period grouping dividers.
- Display Col 1 details and Pax counts, omitting rates and subtotal columns.
