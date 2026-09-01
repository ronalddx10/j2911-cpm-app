import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { generateInvoicePDF, getInvoiceStorageDir } from '@/lib/pdf';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-role');
  if (!userId || !role) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const orderId = BigInt(id);

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      with: {
        status: true,
        client: true,
        venue: true,
        serviceType: true,
        orderDays: {
          with: {
            mealPeriods: {
              with: {
                menu: {
                  with: {
                    menuItems: {
                      with: {
                        item: true,
                      },
                    },
                  },
                },
                mealPeriodItems: {
                  with: {
                    item: true,
                  },
                },
              },
            },
          },
          orderBy: (od, { asc }) => [asc(od.eventDate)],
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { message: 'Order not found.' } },
        { status: 404 }
      );
    }

    // Role / Ownership check
    if (role !== 'ADMIN' && order.createdByUserId !== BigInt(userId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Not authorized to access this invoice.' } },
        { status: 403 }
      );
    }

    const dir = getInvoiceStorageDir();
    const filename = `invoice_${order.id}.pdf`;
    const filepath = path.join(dir, filename);

    if (!fs.existsSync(filepath)) {
      // Regenerate the invoice PDF file dynamically
      generateInvoicePDF(order);

      // Update order details in the DB
      await db.update(schema.orders)
        .set({
          pdfGeneratedFlag: true,
          pdfFilePath: `/api/orders/${orderId}/pdf`,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, orderId));
    }

    const fileBuffer = fs.readFileSync(filepath);

    const response = new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice_${order.id}.pdf"`,
      },
    });

    return response;
  } catch (error: any) {
    console.error('Invoice PDF fetch error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
