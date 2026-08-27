# PDF Client Contact Person Design Spec

## 1. Goal
Ensure company/organization contact persons are included next to their respective organization names in the client details metadata row on both the invoice PDF and kitchen production PDF outputs.

---

## 2. Component Design & Changes

### A. PDF Output Layout (`src/lib/pdf.ts`)
1. **Invoice PDF Header (`generateInvoicePDF`)**:
   - In `generateInvoicePDF`'s `buildHeader` function, check if the client type is `ORGANIZATION`.
   - If yes, resolve the contact name as `firstName lastName` and format the client row to show organization, contact name, and mobile number:
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
   - Change the header array line to:
     `(${clientDetail}) Tj`

2. **Kitchen PDF Header (`generateKitchenPDF`)**:
   - Apply the exact same logic in `generateKitchenPDF`'s `buildHeader` function.
