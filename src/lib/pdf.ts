/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import fs from 'fs';
import path from 'path';

function escapePDFText(text: string | null | undefined): string {
  if (!text) return '';
  return text.toString().replace(/[\\()]/g, '\\$&');
}

function wrapText(text: string | null | undefined, maxCharsPerLine: number): string[] {
  if (!text) return ['N/A'];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine.trim());
      }
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  return lines.length > 0 ? lines : ['N/A'];
}

function formatTime(timeVal: any): string {
  if (!timeVal) return 'N/A';
  if (typeof timeVal === 'string') {
    if (timeVal.includes(':')) {
      const parts = timeVal.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return timeVal;
  }
  const date = new Date(timeVal);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function generateInvoicePDF(order: any): string {
  const dir = path.join(process.cwd(), 'public', 'invoices');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = `invoice_${order.id}.pdf`;
  const filepath = path.join(dir, filename);

  const isOrg = ['COMPANY', 'GOVERNMENT', 'NON_PROFIT', 'ORGANIZATION'].includes(order.client?.clientType);
  const clientName = isOrg && order.client?.organizationName
    ? order.client.organizationName
    : `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim() || 'Client';

  const ingressStr = formatTime(order.ingressTime);
  const egressStr = formatTime(order.egressTime);

  // We will loop through order.orderDays to render exactly one page per event day.
  const days = order.orderDays || [];
  const totalPages = days.length || 1;

  // Header template builder
  const buildHeader = (pageIndex: number = 1, total: number = 1) => {
    const venueName = order.venue?.venueName || (order.eventName ? `${order.eventName} (Delivery)` : 'Custom Delivery Location');
    const address = order.venue ? order.venue.physicalAddress : (order.customDeliveryAddress || 'N/A');
    const specialInstructions = order.specialInstructions || 'None';

    const escapedClient = escapePDFText(clientName);
    const escapedVenue = escapePDFText(venueName);
    const escapedAddress = escapePDFText(address);
    const escapedService = escapePDFText(order.serviceType.serviceName);
    const escapedInstructions = escapePDFText(specialInstructions);

    let clientDetail = `Client: ${escapedClient}`;
    if (order.client.clientType !== 'INDIVIDUAL') {
      const contactName = `${order.client.firstName || ''} ${order.client.lastName || ''}`.trim();
      if (contactName) {
        clientDetail += `  |  Primary: ${escapePDFText(contactName)}`;
      }
      if (order.client.secondaryContactName) {
        clientDetail += `  |  Secondary: ${escapePDFText(order.client.secondaryContactName)}`;
      }
    }
    clientDetail += `  |  Mobile: ${escapePDFText(order.client?.phone || 'N/A')}`;

    const eventLine = order.eventName
      ? `Event: ${escapePDFText(order.eventName)}  |  Service: ${escapedService}`
      : `Service Type: ${escapedService}`;

    return [
      // 1. Vector Drawing for Header Card
      `0.145 0.388 0.922 rg`, // Blue-600
      `50 670 512 80 re f`,
      
      // 2. Text block for Header Text
      `BT`,
      `/F2 13 Tf`,
      `1.0 1.0 1.0 rg`,
      `70 718 Td`,
      `(CPM ORDER MONITORING SYSTEM - INVOICE) Tj`,
      `/F1 10 Tf`,
      `0 -20 Td`,
      `(Invoice Number: INV-2026-${order.id}) Tj`,
      `ET`,
      
      // 3. Text block for Metadata Fields
      `BT`,
      `/F1 9 Tf`,
      `0.118 0.161 0.231 rg`, // Slate-800
      `50 635 Td`,
      `(${clientDetail}) Tj`,
      `0 -16 Td`,
      `(Event Venue: ${escapedVenue}  |  Delivery Address: ${escapedAddress}) Tj`,
      `0 -16 Td`,
      `(${eventLine}  |  Ingress: ${ingressStr}  |  Egress: ${egressStr}) Tj`,
      `0 -16 Td`,
      `(Special Instructions: ${escapedInstructions}) Tj`,
      `ET`,
      
      // 4. Vector Drawing for Divider Line
      `0.886 0.910 0.941 RG`, // Slate-200
      `0.5 w`,
      `50 545 m`,
      `562 545 l`,
      `S`
    ];
  };

  const streams: string[] = [];

  if (days.length === 0) {
    // Fallback if no days are specified
    const textLines = [
      ...buildHeader(1, 1),
      `BT`,
      `/F2 13 Tf`,
      `0.118 0.161 0.231 rg`, // Slate-800
      `50 500 Td`,
      `(No Event Days Scheduled for this order.) Tj`,
      `/F2 11 Tf`,
      `0 -25 Td`,
      `(Grand Total: PHP ${escapePDFText(Number(order.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 }))}) Tj`,
      `ET`,
      `BT /F1 9 Tf 0.376 0.443 0.529 rg 270 30 Td (Page 1 of 1) Tj ET`
    ];
    streams.push(textLines.join('\n'));
  } else {
    days.forEach((day: any, idx: number) => {
      const pageNum = idx + 1;
      const formattedDate = new Date(day.eventDate).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const dayHeading = totalPages > 1 
        ? `Day ${pageNum} of ${totalPages}: ${escapePDFText(formattedDate)}`
        : `Day 1: ${escapePDFText(formattedDate)}`;

      const dayLines = [
        ...buildHeader(pageNum, totalPages)
      ];

      let currentY = 525;
      let daySubtotal = 0;

      // Draw Day Header Bar Background
      dayLines.push(`0.945 0.961 0.976 rg`); // Slate-100
      dayLines.push(`50 ${currentY - 20} 512 20 re f`);
      
      // Day Header Text Block
      dayLines.push(`BT`);
      dayLines.push(`/F2 11 Tf`); // Helvetica-Bold
      dayLines.push(`0.059 0.090 0.165 rg`); // Slate-900
      dayLines.push(`60 ${currentY - 14} Td`);
      dayLines.push(`(${dayHeading}) Tj`);
      dayLines.push(`ET`);
      
      currentY -= 20;

      // Group meals by mealPeriod
      const groupedMeals = (day.mealPeriods || []).reduce((acc: any, meal: any) => {
        const period = meal.mealPeriod || 'Other';
        if (!acc[period]) acc[period] = [];
        acc[period].push(meal);
        return acc;
      }, {});

      Object.entries(groupedMeals).forEach(([period, meals]: [string, any]) => {
        currentY -= 15;
        dayLines.push(`0.973 0.980 0.988 rg`); // Slate-50
        dayLines.push(`50 ${currentY - 16} 512 16 re f`);
        
        dayLines.push(`BT`);
        dayLines.push(`/F2 10 Tf`); // Helvetica-Bold
        dayLines.push(`0.145 0.388 0.922 rg`); // Blue-600
        dayLines.push(`60 ${currentY - 11} Td`);
        dayLines.push(`(${escapePDFText(period)}) Tj`);
        dayLines.push(`ET`);
        
        currentY -= 16;

        meals.forEach((meal: any) => {
          currentY -= 20;

          const menuTitle = meal.customName || meal.menu?.title || 'Custom Combo';
          const baseRate = Number(meal.rate || 0);
          const subtotal = baseRate * meal.pax;
          daySubtotal += subtotal;

          const serviceTimeVal = meal.serviceTime ? formatTime(meal.serviceTime) : 'N/A';
          const isExtra = meal.mealPeriod === 'Extra' || meal.mealPeriod === 'Extras';
          const titleStr = isExtra ? menuTitle : `${menuTitle} @ ${serviceTimeVal}`;
          
          const itemsList = meal.mealPeriodItems && meal.mealPeriodItems.length > 0
            ? meal.mealPeriodItems.map((i: any) => i.item?.itemName).filter(Boolean)
            : (meal.menu?.menuItems?.map((i: any) => i.item?.itemName).filter(Boolean) || []);
          const itemsText = `Items: ${itemsList.join(', ')}`;

          // Row details text block
          dayLines.push(`BT`);
          dayLines.push(`/F1 10 Tf`);
          dayLines.push(`0.118 0.161 0.231 rg`); // Slate-800
          
          // Col 1 (Menu Package Name)
          dayLines.push(`60 ${currentY} Td`);
          dayLines.push(`(${escapePDFText(titleStr)}) Tj`);
          
          // Col 2 (Rate) - relative X displacement to 370 (310 from 60)
          dayLines.push(`310 0 Td`);
          dayLines.push(`(PHP ${baseRate.toFixed(2)}) Tj`);
          
          // Col 3 (Pax) - relative X displacement to 450 (80 from 370)
          dayLines.push(`80 0 Td`);
          dayLines.push(`(${meal.pax} Pax) Tj`);
          
          // Col 4 (Subtotal) - relative X displacement to 510 (60 from 450)
          dayLines.push(`60 0 Td`);
          dayLines.push(`(PHP ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}) Tj`);
          dayLines.push(`ET`);

          // Items list text block (chunked in groups of 3 to prevent page overflow)
          const chunkedItems: string[][] = [];
          for (let k = 0; k < itemsList.length; k += 3) {
            chunkedItems.push(itemsList.slice(k, k + 3));
          }

          if (chunkedItems.length === 0) {
            chunkedItems.push(['None']);
          }

          for (let cIdx = 0; cIdx < chunkedItems.length; cIdx++) {
            currentY -= 12;
            const prefix = cIdx === 0 ? 'Items: ' : '       ';
            const itemsText = `${prefix}${chunkedItems[cIdx].join(', ')}`;
            dayLines.push(`BT`);
            dayLines.push(`/F1 9 Tf`);
            dayLines.push(`0.376 0.443 0.529 rg`); // Slate-600
            dayLines.push(`60 ${currentY} Td`);
            dayLines.push(`(${escapePDFText(itemsText)}) Tj`);
            dayLines.push(`ET`);
          }

          // Draw bottom light divider stroke
          dayLines.push(`0.886 0.910 0.941 RG`); // Slate-200
          dayLines.push(`0.3 w`);
          dayLines.push(`50 ${currentY - 6} m`);
          dayLines.push(`562 ${currentY - 6} l`);
          dayLines.push(`S`);
          
          currentY -= 6;
        });
      });

      currentY -= 25;
      dayLines.push(`BT`);
      dayLines.push(`/F2 11 Tf`); // Helvetica-Bold
      dayLines.push(`0.118 0.161 0.231 rg`); // Slate-800
      dayLines.push(`50 ${currentY} Td`);
      dayLines.push(`(Day Estimate: PHP ${daySubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}) Tj`);
      dayLines.push(`ET`);

      // If it's the last page, show the grand total cost of the invoice
      if (pageNum === totalPages) {
        currentY -= 20;
        dayLines.push(`BT`);
        dayLines.push(`/F2 13 Tf`); // Helvetica-Bold
        dayLines.push(`0.145 0.388 0.922 rg`); // Blue-600
        dayLines.push(`50 ${currentY} Td`);
        dayLines.push(`(GRAND TOTAL COST: PHP ${escapePDFText(Number(order.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 }))}) Tj`);
        dayLines.push(`ET`);
      }

      currentY -= 30;
      dayLines.push(`BT`);
      dayLines.push(`/F1 9 Tf`);
      dayLines.push(`0.376 0.443 0.529 rg`); // Slate-600
      dayLines.push(`50 ${currentY} Td`);
      dayLines.push(`(Thank you for your business!) Tj`);
      dayLines.push(`0 -12 Td`);
      dayLines.push(`(CPM Order Monitoring System - Invoice Document) Tj`);
      dayLines.push(`ET`);
      
      // Page number at bottom
      dayLines.push(`BT /F1 9 Tf 0.376 0.443 0.529 rg 270 30 Td (Page ${pageNum} of ${totalPages}) Tj ET`);

      streams.push(dayLines.join('\n'));
    });
  }

  // -------------------------------------------------------------------
  // Assemble the multi-page PDF structure dynamically
  // -------------------------------------------------------------------
  const headerSection = `%PDF-1.4\n`;
  const catalogObjNum = 1;
  const pagesObjNum = 2;
  const fontObjNum = 3;
  const font2ObjNum = 4;

  // Font objects
  const fontObjStr = `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  const font2ObjStr = `${font2ObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  // We need to determine the object number offsets.
  // Catalog + Pages + Font1 + Font2 = 4 objects.
  // Each page requires 2 objects: Page definition object & Stream content object.
  // Total objects = 4 + 2 * totalPages
  const kids: string[] = [];
  const pageObjects: string[] = [];
  const streamObjects: string[] = [];

  let nextObjNum = 5;
  streams.forEach((streamContent) => {
    const pageObjNum = nextObjNum;
    const streamObjNum = nextObjNum + 1;
    kids.push(`${pageObjNum} 0 R`);

    const streamLength = Buffer.byteLength(streamContent, 'utf8');

    const pageObjStr = `${pageObjNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R /F2 ${font2ObjNum} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${streamObjNum} 0 R >>\nendobj\n`;
    const streamObjStr = `${streamObjNum} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;

    pageObjects.push(pageObjStr);
    streamObjects.push(streamObjStr);

    nextObjNum += 2;
  });

  const catalogObjStr = `${catalogObjNum} 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj\n`;
  const pagesObjStr = `${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>\nendobj\n`;

  // Compute cumulative byte offsets for xref table
  const offsets: number[] = [];
  let currentOffset = Buffer.byteLength(headerSection, 'utf8');

  // Object 1: Catalog
  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(catalogObjStr, 'utf8');

  // Object 2: Pages
  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(pagesObjStr, 'utf8');

  // Object 3: Font
  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(fontObjStr, 'utf8');

  // Object 4: Font2
  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(font2ObjStr, 'utf8');

  // Page and Stream objects
  for (let i = 0; i < totalPages; i++) {
    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(pageObjects[i], 'utf8');

    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(streamObjects[i], 'utf8');
  }

  // Concatenate PDF body
  const body = headerSection + 
               catalogObjStr + 
               pagesObjStr + 
               fontObjStr + 
               font2ObjStr + 
               pageObjects.map((p, idx) => p + streamObjects[idx]).join('');

  const startxrefPos = Buffer.byteLength(body, 'utf8');

  // Xref table
  const pad = (n: number) => String(n).padStart(10, '0');
  const xrefLines = [
    `xref`,
    `0 ${nextObjNum}`,
    `0000000000 65535 f `
  ];

  offsets.forEach((off) => {
    xrefLines.push(`${pad(off)} 00000 n `);
  });

  const trailer = [
    `trailer`,
    `<< /Size ${nextObjNum} /Root ${catalogObjNum} 0 R >>`,
    `startxref`,
    `${startxrefPos}`,
    `%%EOF`
  ].join('\n');

  const pdfTemplate = body + xrefLines.join('\n') + '\n' + trailer;

  fs.writeFileSync(filepath, pdfTemplate, 'utf-8');
  return `/invoices/${filename}`;
}

export function generateKitchenPDF(order: any): string {
  const dir = path.join(process.cwd(), 'public', 'invoices');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = `kitchen_production_${order.id}.pdf`;
  const filepath = path.join(dir, filename);

  const isOrg = ['COMPANY', 'GOVERNMENT', 'NON_PROFIT', 'ORGANIZATION'].includes(order.client?.clientType);
  const clientName = isOrg && order.client?.organizationName
    ? order.client.organizationName
    : `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim() || 'Client';

  const ingressStr = formatTime(order.ingressTime);
  const egressStr = formatTime(order.egressTime);

  const days = order.orderDays || [];
  const totalPages = days.length || 1;

  const buildHeader = (pageIndex: number = 1, total: number = 1) => {
    const venueName = order.venue?.venueName || (order.eventName ? `${order.eventName} (Delivery)` : 'Custom Delivery Location');
    const address = order.venue ? order.venue.physicalAddress : (order.customDeliveryAddress || 'N/A');
    const specialInstructions = order.specialInstructions || 'None';

    const escapedClient = escapePDFText((clientName || '').trim() || 'N/A');
    const escapedVenue = escapePDFText(venueName);
    const escapedAddress = escapePDFText(address);
    const escapedService = escapePDFText(order.serviceType?.serviceName || 'N/A');
    const escapedInstructions = escapePDFText(specialInstructions);

    let clientDetail = `Client: ${escapedClient}`;
    if (order.client?.clientType !== 'INDIVIDUAL') {
      const contactName = `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim();
      if (contactName) {
        clientDetail += `  |  Primary: ${escapePDFText(contactName)}`;
      }
      if (order.client?.secondaryContactName) {
        clientDetail += `  |  Secondary: ${escapePDFText(order.client.secondaryContactName)}`;
      }
    }
    clientDetail += `  |  Mobile: ${escapePDFText(order.client?.phone || 'N/A')}`;

    const eventLine = order.eventName
      ? `Event: ${escapePDFText(order.eventName)}  |  Service: ${escapedService}`
      : `Service Type: ${escapedService}`;

    return [
      // 1. Vector Drawing for Header Card
      `0.145 0.388 0.922 rg`, // Blue-600
      `50 670 512 80 re f`,
      
      // 2. Text block for Header Text
      `BT`,
      `/F2 13 Tf`,
      `1.0 1.0 1.0 rg`,
      `70 718 Td`,
      `(CPM KITCHEN PRODUCTION ORDER) Tj`,
      `/F1 10 Tf`,
      `0 -20 Td`,
      `(Order ID / Invoice No: INV-2026-${order.id}) Tj`,
      `ET`,
      
      // 3. Text block for Metadata Fields
      `BT`,
      `/F1 9 Tf`,
      `0.118 0.161 0.231 rg`, // Slate-800
      `50 635 Td`,
      `(${clientDetail}) Tj`,
      `0 -16 Td`,
      `(Event Venue: ${escapedVenue}  |  Delivery Address: ${escapedAddress}) Tj`,
      `0 -16 Td`,
      `(${eventLine}  |  Ingress: ${ingressStr}  |  Egress: ${egressStr}) Tj`,
      `0 -16 Td`,
      `(Special Instructions: ${escapedInstructions}) Tj`,
      `ET`,
      
      // 4. Vector Drawing for Divider Line
      `0.886 0.910 0.941 RG`, // Slate-200
      `0.5 w`,
      `50 545 m`,
      `562 545 l`,
      `S`
    ];
  };

  const streams: string[] = [];

  if (days.length === 0) {
    const textLines = [
      ...buildHeader(1, 1),
      `BT`,
      `/F2 13 Tf`,
      `0.118 0.161 0.231 rg`, // Slate-800
      `50 500 Td`,
      `(No Event Days Scheduled for this order.) Tj`,
      `ET`,
      `BT /F1 9 Tf 0.376 0.443 0.529 rg 270 30 Td (Page 1 of 1) Tj ET`
    ];
    streams.push(textLines.join('\n'));
  } else {
    days.forEach((day: any, idx: number) => {
      const pageNum = idx + 1;
      const formattedDate = new Date(day.eventDate).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const dayHeading = totalPages > 1 
        ? `Day ${pageNum} of ${totalPages}: ${escapePDFText(formattedDate)}`
        : `Day 1: ${escapePDFText(formattedDate)}`;

      const dayLines = [
        ...buildHeader(pageNum, totalPages)
      ];

      let currentY = 525;

      // Draw Day Header Bar Background
      dayLines.push(`0.945 0.961 0.976 rg`); // Slate-100
      dayLines.push(`50 ${currentY - 20} 512 20 re f`);
      
      // Day Header Text Block
      dayLines.push(`BT`);
      dayLines.push(`/F2 11 Tf`); // Helvetica-Bold
      dayLines.push(`0.059 0.090 0.165 rg`); // Slate-900
      dayLines.push(`60 ${currentY - 14} Td`);
      dayLines.push(`(${dayHeading}) Tj`);
      dayLines.push(`ET`);
      
      currentY -= 20;

      const groupedMeals = (day.mealPeriods || []).reduce((acc: any, meal: any) => {
        const period = meal.mealPeriod || 'Other';
        if (!acc[period]) acc[period] = [];
        acc[period].push(meal);
        return acc;
      }, {});

      Object.entries(groupedMeals).forEach(([period, meals]: [string, any]) => {
        currentY -= 15;
        dayLines.push(`0.941 0.965 0.988 rg`); // Light blue/grey (Blue-50)
        dayLines.push(`50 ${currentY - 16} 512 16 re f`);
        
        dayLines.push(`BT`);
        dayLines.push(`/F2 10 Tf`); // Helvetica-Bold
        dayLines.push(`0.145 0.388 0.922 rg`); // Blue-600
        dayLines.push(`60 ${currentY - 11} Td`);
        dayLines.push(`(${escapePDFText(period)}) Tj`);
        dayLines.push(`ET`);
        
        currentY -= 16;

        meals.forEach((meal: any) => {
          currentY -= 20;

          const menuTitle = meal.customName || meal.menu?.title || 'Custom Combo';
          const serviceTimeStr = meal.serviceTime ? formatTime(meal.serviceTime) : 'N/A';
          const isExtra = meal.mealPeriod === 'Extra' || meal.mealPeriod === 'Extras';
          const titleStr = isExtra ? menuTitle : `${menuTitle} @ ${serviceTimeStr}`;
          
          const itemsList = meal.mealPeriodItems && meal.mealPeriodItems.length > 0
            ? meal.mealPeriodItems.map((i: any) => i.item?.itemName).filter(Boolean)
            : (meal.menu?.menuItems?.map((i: any) => i.item?.itemName).filter(Boolean) || []);
          const itemsText = `Items: ${itemsList.join(', ')}`;

          // Row details text block
          dayLines.push(`BT`);
          dayLines.push(`/F1 10 Tf`);
          dayLines.push(`0.118 0.161 0.231 rg`); // Slate-800
          
          // Col 1 (Menu Package Name)
          dayLines.push(`60 ${currentY} Td`);
          dayLines.push(`(${escapePDFText(titleStr)}) Tj`);
          
          // Col 2 (Pax) - X-offset relative displacement to 460 (400 from 60)
          dayLines.push(`400 0 Td`);
          dayLines.push(`(${meal.pax} Pax) Tj`);
          dayLines.push(`ET`);

          // Items list text block (chunked in groups of 3 to prevent page overflow)
          const chunkedItems: string[][] = [];
          for (let k = 0; k < itemsList.length; k += 3) {
            chunkedItems.push(itemsList.slice(k, k + 3));
          }

          if (chunkedItems.length === 0) {
            chunkedItems.push(['None']);
          }

          for (let cIdx = 0; cIdx < chunkedItems.length; cIdx++) {
            currentY -= 12;
            const prefix = cIdx === 0 ? 'Items: ' : '       ';
            const itemsText = `${prefix}${chunkedItems[cIdx].join(', ')}`;
            dayLines.push(`BT`);
            dayLines.push(`/F1 9 Tf`);
            dayLines.push(`0.376 0.443 0.529 rg`); // Slate-600
            dayLines.push(`60 ${currentY} Td`);
            dayLines.push(`(${escapePDFText(itemsText)}) Tj`);
            dayLines.push(`ET`);
          }
        });
      });

      // Bottom footer block
      dayLines.push(`BT`);
      dayLines.push(`/F1 9 Tf`);
      dayLines.push(`0.376 0.443 0.529 rg`); // Slate-600
      dayLines.push(`50 40 Td`);
      dayLines.push(`(CPM Kitchen Production Document) Tj`);
      dayLines.push(`ET`);

      dayLines.push(`BT /F1 9 Tf 0.376 0.443 0.529 rg 270 30 Td (Page ${pageNum} of ${totalPages}) Tj ET`);

      streams.push(dayLines.join('\n'));
    });
  }

  const headerSection = `%PDF-1.4\n`;
  const catalogObjNum = 1;
  const pagesObjNum = 2;
  const fontObjNum = 3;
  const font2ObjNum = 4;

  const fontObjStr = `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  const font2ObjStr = `${font2ObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  const kids: string[] = [];
  const pageObjects: string[] = [];
  const streamObjects: string[] = [];

  let nextObjNum = 5;
  streams.forEach((streamContent) => {
    const pageObjNum = nextObjNum;
    const streamObjNum = nextObjNum + 1;
    kids.push(`${pageObjNum} 0 R`);

    const streamLength = Buffer.byteLength(streamContent, 'utf8');

    const pageObjStr = `${pageObjNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R /F2 ${font2ObjNum} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${streamObjNum} 0 R >>\nendobj\n`;
    const streamObjStr = `${streamObjNum} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;

    pageObjects.push(pageObjStr);
    streamObjects.push(streamObjStr);

    nextObjNum += 2;
  });

  const catalogObjStr = `${catalogObjNum} 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj\n`;
  const pagesObjStr = `${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>\nendobj\n`;

  const offsets: number[] = [];
  let currentOffset = Buffer.byteLength(headerSection, 'utf8');

  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(catalogObjStr, 'utf8');

  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(pagesObjStr, 'utf8');

  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(fontObjStr, 'utf8');

  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(font2ObjStr, 'utf8');

  for (let i = 0; i < totalPages; i++) {
    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(pageObjects[i], 'utf8');

    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(streamObjects[i], 'utf8');
  }

  const body = headerSection + 
               catalogObjStr + 
               pagesObjStr + 
               fontObjStr + 
               font2ObjStr + 
               pageObjects.map((p, idx) => p + streamObjects[idx]).join('');

  const startxrefPos = Buffer.byteLength(body, 'utf8');

  const pad = (n: number) => String(n).padStart(10, '0');
  const xrefLines = [
    `xref`,
    `0 ${nextObjNum}`,
    `0000000000 65535 f `
  ];

  offsets.forEach((off) => {
    xrefLines.push(`${pad(off)} 00000 n `);
  });

  const trailer = [
    `trailer`,
    `<< /Size ${nextObjNum} /Root ${catalogObjNum} 0 R >>`,
    `startxref`,
    `${startxrefPos}`,
    `%%EOF`
  ].join('\n');

  const pdfTemplate = body + xrefLines.join('\n') + '\n' + trailer;

  fs.writeFileSync(filepath, pdfTemplate, 'utf-8');
  return `/invoices/${filename}`;
}

export function assemblePDFContent(streams: string[], isLandscape = false): string {
  const headerSection = `%PDF-1.4\n`;
  const catalogObjNum = 1;
  const pagesObjNum = 2;
  const fontObjNum = 3;
  const font2ObjNum = 4;

  const fontObjStr = `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  const font2ObjStr = `${font2ObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  const kids: string[] = [];
  const pageObjects: string[] = [];
  const streamObjects: string[] = [];
  const totalPages = streams.length || 1;

  const mediaBox = isLandscape ? '[0 0 792 612]' : '[0 0 612 792]';

  let nextObjNum = 5;
  streams.forEach((streamContent) => {
    const pageObjNum = nextObjNum;
    const streamObjNum = nextObjNum + 1;
    kids.push(`${pageObjNum} 0 R`);

    const streamLength = Buffer.byteLength(streamContent, 'utf8');

    const pageObjStr = `${pageObjNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R /F2 ${font2ObjNum} 0 R >> >> /MediaBox ${mediaBox} /Contents ${streamObjNum} 0 R >>\nendobj\n`;
    const streamObjStr = `${streamObjNum} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;

    pageObjects.push(pageObjStr);
    streamObjects.push(streamObjStr);

    nextObjNum += 2;
  });

  const catalogObjStr = `${catalogObjNum} 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj\n`;
  const pagesObjStr = `${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>\nendobj\n`;

  const offsets: number[] = [];
  let currentOffset = Buffer.byteLength(headerSection, 'utf8');

  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(catalogObjStr, 'utf8');

  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(pagesObjStr, 'utf8');

  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(fontObjStr, 'utf8');

  offsets.push(currentOffset);
  currentOffset += Buffer.byteLength(font2ObjStr, 'utf8');

  for (let i = 0; i < totalPages; i++) {
    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(pageObjects[i], 'utf8');

    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(streamObjects[i], 'utf8');
  }

  const body = headerSection + 
               catalogObjStr + 
               pagesObjStr + 
               fontObjStr + 
               font2ObjStr + 
               pageObjects.map((p, idx) => p + streamObjects[idx]).join('');

  const startxrefPos = Buffer.byteLength(body, 'utf8');

  const pad = (n: number) => String(n).padStart(10, '0');
  const xrefLines = [
    `xref`,
    `0 ${nextObjNum}`,
    `0000000000 65535 f `
  ];

  offsets.forEach((off) => {
    xrefLines.push(`${pad(off)} 00000 n `);
  });

  const trailer = [
    `trailer`,
    `<< /Size ${nextObjNum} /Root ${catalogObjNum} 0 R >>`,
    `startxref`,
    `${startxrefPos}`,
    `%%EOF`
  ].join('\n');

  return body + xrefLines.join('\n') + '\n' + trailer;
}

export function generateOrderListPDF(orders: any[], filters: any): string {
  const streams: string[] = [];
  const itemsPerPage = 15;
  const totalPages = Math.ceil(orders.length / itemsPerPage) || 1;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pageLines: string[] = [];
    
    // Draw Blue Header Card background
    pageLines.push(`0.145 0.388 0.922 rg`);
    pageLines.push(`50 490 692 80 re f`);

    // Title Text
    pageLines.push(`BT`);
    pageLines.push(`/F2 13 Tf`);
    pageLines.push(`1.0 1.0 1.0 rg`);
    pageLines.push(`70 538 Td`);
    pageLines.push(`(CPM ORDER MONITORING SYSTEM - ORDER REPORT) Tj`);
    pageLines.push(`/F1 9 Tf`);
    pageLines.push(`0 -20 Td`);
    const statusText = escapePDFText(filters.status ? `Status: ${filters.status}` : 'Status: ALL');
    const monthText = escapePDFText(filters.month ? `Month: ${filters.month}` : 'Month: ALL');
    const yearText = escapePDFText(filters.year ? `Year: ${filters.year}` : 'Year: ALL');
    const searchText = filters.search ? `Search: "${escapePDFText(filters.search)}"` : '';
    pageLines.push(`(Filters - ${statusText}  |  ${monthText}  |  ${yearText} ${searchText ? '  |  ' + searchText : ''}) Tj`);
    pageLines.push(`ET`);

    // Table Headers background
    pageLines.push(`0.941 0.961 0.980 rg`); // Slate-100
    pageLines.push(`50 445 692 20 re f`);

    // Table Header Text
    pageLines.push(`BT`);
    pageLines.push(`/F2 9 Tf`);
    pageLines.push(`0.118 0.161 0.231 rg`); // Slate-800
    pageLines.push(`55 451 Td`);
    pageLines.push(`(ID) Tj`);
    pageLines.push(`50 0 Td`);
    pageLines.push(`(Client) Tj`);
    pageLines.push(`105 0 Td`);
    pageLines.push(`(Pax) Tj`);
    pageLines.push(`35 0 Td`);
    pageLines.push(`(Delivery Address) Tj`);
    pageLines.push(`200 0 Td`);
    pageLines.push(`(Event Date\\(s\\)) Tj`);
    pageLines.push(`105 0 Td`);
    pageLines.push(`(Service Type) Tj`);
    pageLines.push(`ET`);

    pageLines.push(`BT /F2 9 Tf 0.118 0.161 0.231 rg 670 451 Td (Total) Tj ET`);

    const startIndex = (pageNum - 1) * itemsPerPage;
    const pageOrders = orders.slice(startIndex, startIndex + itemsPerPage);
    let currentY = 420;

    pageOrders.forEach((order, idx) => {
      const isOrg = ['COMPANY', 'GOVERNMENT', 'NON_PROFIT', 'ORGANIZATION'].includes(order.client?.clientType);
      const clientName = isOrg && order.client?.organizationName
        ? order.client.organizationName
        : `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim() || 'N/A';
      const escapedClient = escapePDFText((clientName.trim() || 'N/A').substring(0, 24));

      const deliveryAddress = order.venue
        ? `${order.venue.venueName} (${order.venue.physicalAddress})`
        : (order.customDeliveryAddress || 'N/A');
      const addressLines = wrapText(deliveryAddress || 'N/A', 35);

      const dates = (order.orderDays || []).map((d: any) => new Date(d.eventDate).toLocaleDateString()).join(', ');
      const escapedDates = escapePDFText(dates.substring(0, 18));
      
      const serviceName = order.serviceType?.serviceName || 'N/A';
      const serviceLines = wrapText(serviceName, 20);

      const formattedTotal = Number(order.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 });

      const maxLines = Math.max(addressLines.length, serviceLines.length, 1);
      const rowHeight = maxLines * 12 + 8;

      if (idx % 2 === 1) {
        pageLines.push(`0.973 0.980 0.988 rg`); // Slate-50
        pageLines.push(`50 ${currentY + 12 - rowHeight} 692 ${rowHeight} re f`);
      }

      pageLines.push(`0.886 0.910 0.941 RG`); // Slate-200
      pageLines.push(`0.5 w`);
      pageLines.push(`50 ${currentY + 12 - rowHeight} m 742 ${currentY + 12 - rowHeight} l S`);

      // Print first-line absolute columns
      pageLines.push(`BT`);
      pageLines.push(`/F1 9 Tf`);
      pageLines.push(`0.118 0.161 0.231 rg`); // Slate-800
      pageLines.push(`55 ${currentY} Td`);
      pageLines.push(`(INV-${order.id}) Tj`);
      pageLines.push(`50 0 Td`);
      pageLines.push(`(${escapedClient}) Tj`);
      pageLines.push(`105 0 Td`);
      pageLines.push(`(${order.pax}) Tj`);
      pageLines.push(`235 0 Td`);
      pageLines.push(`(${escapedDates}) Tj`);
      pageLines.push(`ET`);

      pageLines.push(`BT /F2 9 Tf 0.118 0.161 0.231 rg 670 ${currentY} Td (PHP ${formattedTotal}) Tj ET`);

      // Print wrapped Delivery Address starting at X=245
      addressLines.forEach((line, lineIdx) => {
        const escapedLine = escapePDFText(line);
        pageLines.push(`BT /F1 9 Tf 0.118 0.161 0.231 rg 245 ${currentY - lineIdx * 12} Td (${escapedLine}) Tj ET`);
      });

      // Print wrapped Service Type starting at X=550
      serviceLines.forEach((line, lineIdx) => {
        const escapedLine = escapePDFText(line);
        pageLines.push(`BT /F1 9 Tf 0.118 0.161 0.231 rg 550 ${currentY - lineIdx * 12} Td (${escapedLine}) Tj ET`);
      });

      currentY -= rowHeight;
    });

    pageLines.push(`BT /F1 9 Tf 0.376 0.443 0.529 rg 370 30 Td (Page ${pageNum} of ${totalPages}) Tj ET`);
    pageLines.push(`BT /F1 9 Tf 0.376 0.443 0.529 rg 50 30 Td (CPM Order Report) Tj ET`);

    streams.push(pageLines.join('\n'));
  }

  return assemblePDFContent(streams, true);
}

export function generateMenuCatalogPDF(menus: any[]): string {
  const streams: string[] = [];
  const itemsPerPage = 15;
  const totalPages = Math.ceil(menus.length / itemsPerPage) || 1;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pageLines: string[] = [];

    // Draw Blue Header Card background
    pageLines.push(`0.145 0.388 0.922 rg`);
    pageLines.push(`50 670 512 80 re f`);

    // Title Text
    pageLines.push(`BT`);
    pageLines.push(`/F2 13 Tf`);
    pageLines.push(`1.0 1.0 1.0 rg`);
    pageLines.push(`70 718 Td`);
    pageLines.push(`(CPM ORDER MONITORING SYSTEM - MENU PACKAGES) Tj`);
    pageLines.push(`/F1 9 Tf`);
    pageLines.push(`0 -20 Td`);
    pageLines.push(`(Menu Packages & Pricing Catalog Report) Tj`);
    pageLines.push(`ET`);

    // Table Headers background
    pageLines.push(`0.941 0.961 0.980 rg`); // Slate-100
    pageLines.push(`50 625 512 20 re f`);

    // Table Header Text
    pageLines.push(`BT`);
    pageLines.push(`/F2 9 Tf`);
    pageLines.push(`0.118 0.161 0.231 rg`); // Slate-800
    pageLines.push(`55 631 Td`);
    pageLines.push(`(Package Name) Tj`);
    pageLines.push(`150 0 Td`);
    pageLines.push(`(Description) Tj`);
    pageLines.push(`180 0 Td`);
    pageLines.push(`(Base Rate) Tj`);
    pageLines.push(`100 0 Td`);
    pageLines.push(`(Items Count) Tj`);
    pageLines.push(`ET`);

    const startIndex = (pageNum - 1) * itemsPerPage;
    const pageMenus = menus.slice(startIndex, startIndex + itemsPerPage);
    let currentY = 600;

    pageMenus.forEach((menu, idx) => {
      if (idx % 2 === 1) {
        pageLines.push(`0.973 0.980 0.988 rg`); // Slate-50
        pageLines.push(`50 ${currentY - 4} 512 20 re f`);
      }

      pageLines.push(`0.886 0.910 0.941 RG`); // Slate-200
      pageLines.push(`0.5 w`);
      pageLines.push(`50 ${currentY - 4} m 562 ${currentY - 4} l S`);

      const escapedTitle = escapePDFText((menu.title || 'N/A').substring(0, 25));
      const escapedDesc = escapePDFText((menu.description || 'No description').substring(0, 32));
      const formattedRate = Number(menu.baseRate).toLocaleString(undefined, { minimumFractionDigits: 2 });
      const itemsCount = (menu.menuItems || []).length;

      pageLines.push(`BT`);
      pageLines.push(`/F1 9 Tf`);
      pageLines.push(`0.118 0.161 0.231 rg`); // Slate-800
      pageLines.push(`55 ${currentY} Td`);
      pageLines.push(`(${escapedTitle}) Tj`);
      pageLines.push(`150 0 Td`);
      pageLines.push(`(${escapedDesc}) Tj`);
      pageLines.push(`180 0 Td`);
      pageLines.push(`(PHP ${formattedRate}) Tj`);
      pageLines.push(`100 0 Td`);
      pageLines.push(`(${itemsCount} items) Tj`);
      pageLines.push(`ET`);

      currentY -= 20;
    });

    pageLines.push(`BT /F1 9 Tf 0.376 0.443 0.529 rg 270 30 Td (Page ${pageNum} of ${totalPages}) Tj ET`);
    pageLines.push(`BT /F1 9 Tf 0.376 0.443 0.529 rg 50 30 Td (CPM Menu Catalog Report) Tj ET`);

    streams.push(pageLines.join('\n'));
  }

  return assemblePDFContent(streams);
}

export function generateMenuItemsPDF(items: any[]): string {
  const streams: string[] = [];
  const itemsPerPage = 15;
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pageLines: string[] = [];

    // Draw Blue Header Card background
    pageLines.push(`0.145 0.388 0.922 rg`);
    pageLines.push(`50 670 512 80 re f`);

    // Title Text
    pageLines.push(`BT`);
    pageLines.push(`/F2 13 Tf`);
    pageLines.push(`1.0 1.0 1.0 rg`);
    pageLines.push(`70 718 Td`);
    pageLines.push(`(CPM ORDER MONITORING SYSTEM - MENU ITEMS) Tj`);
    pageLines.push(`/F1 9 Tf`);
    pageLines.push(`0 -20 Td`);
    pageLines.push(`(Dish & Menu Item Catalog Ledger Report) Tj`);
    pageLines.push(`ET`);

    // Table Headers background
    pageLines.push(`0.941 0.961 0.980 rg`); // Slate-100
    pageLines.push(`50 625 512 20 re f`);

    // Table Header Text
    pageLines.push(`BT`);
    pageLines.push(`/F2 9 Tf`);
    pageLines.push(`0.118 0.161 0.231 rg`); // Slate-800
    pageLines.push(`55 631 Td`);
    pageLines.push(`(Item Name) Tj`);
    pageLines.push(`200 0 Td`);
    pageLines.push(`(Category) Tj`);
    pageLines.push(`180 0 Td`);
    pageLines.push(`(Unit Price) Tj`);
    pageLines.push(`ET`);

    const startIndex = (pageNum - 1) * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);
    let currentY = 600;

    pageItems.forEach((item, idx) => {
      if (idx % 2 === 1) {
        pageLines.push(`0.973 0.980 0.988 rg`); // Slate-50
        pageLines.push(`50 ${currentY - 4} 512 20 re f`);
      }

      pageLines.push(`0.886 0.910 0.941 RG`); // Slate-200
      pageLines.push(`0.5 w`);
      pageLines.push(`50 ${currentY - 4} m 562 ${currentY - 4} l S`);

      const escapedName = escapePDFText((item.itemName || 'N/A').substring(0, 35));
      const escapedCategory = escapePDFText((item.category || 'N/A').toLowerCase().replace('_', ' '));
      const formattedPrice = Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

      pageLines.push(`BT`);
      pageLines.push(`/F1 9 Tf`);
      pageLines.push(`0.118 0.161 0.231 rg`); // Slate-800
      pageLines.push(`55 ${currentY} Td`);
      pageLines.push(`(${escapedName}) Tj`);
      pageLines.push(`200 0 Td`);
      pageLines.push(`(${escapedCategory}) Tj`);
      pageLines.push(`180 0 Td`);
      pageLines.push(`(PHP ${formattedPrice}) Tj`);
      pageLines.push(`ET`);

      currentY -= 20;
    });

    pageLines.push(`BT /F1 9 Tf 0.376 0.443 0.529 rg 270 30 Td (Page ${pageNum} of ${totalPages}) Tj ET`);
    pageLines.push(`BT /F1 9 Tf 0.376 0.443 0.529 rg 50 30 Td (CPM Menu Items Ledger Report) Tj ET`);

    streams.push(pageLines.join('\n'));
  }

  return assemblePDFContent(streams);
}
