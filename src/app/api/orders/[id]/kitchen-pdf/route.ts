import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { generateKitchenPDF, getInvoiceStorageDir } from '@/lib/pdf';

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

    // Fetch order with all nested relations needed for kitchen PDF
    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      with: {
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
                        item: true
                      }
                    }
                  }
                },
                mealPeriodItems: {
                  with: {
                    item: true
                  }
                }
              }
            }
          }
        }
      }
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
        { success: false, error: { message: 'Not authorized to access this kitchen production sheet.' } },
        { status: 403 }
      );
    }

    const dir = getInvoiceStorageDir();
    const filename = `kitchen_production_${order.id}.pdf`;
    const filepath = path.join(dir, filename);

    if (!fs.existsSync(filepath)) {
      generateKitchenPDF(order);
    }

    if (!fs.existsSync(filepath)) {
      return NextResponse.json(
        { success: false, error: { message: 'Kitchen PDF could not be generated or found.' } },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filepath);

    const response = new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="kitchen_production_${order.id}.pdf"`,
      },
    });

    return response;
  } catch (error: any) {
    console.error('Kitchen PDF fetch error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
