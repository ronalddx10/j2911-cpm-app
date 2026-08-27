import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';
import { generateInvoicePDF } from '@/lib/pdf';

export async function POST(
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

  // Matrix check: Admin only
  if (role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { message: 'Only administrators can approve orders.' } },
      { status: 403 }
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

    const currentStatus = order.status.statusName;
    if (currentStatus !== 'PENDING_APPROVAL' && currentStatus !== 'DRAFT' && currentStatus !== 'FOR_UPDATE') {
      return NextResponse.json(
        { success: false, error: { message: 'Only orders pending review or in draft status can be approved.' } },
        { status: 400 }
      );
    }

    const approvedStatusList = await db.select().from(schema.orderStatuses).where(eq(schema.orderStatuses.statusName, 'APPROVED')).limit(1);
    const approvedStatus = approvedStatusList[0];

    if (!approvedStatus) {
      return NextResponse.json(
        { success: false, error: { message: 'Status catalog misconfigured.' } },
        { status: 500 }
      );
    }

    // 1. Generate the PDF invoice file
    const pdfPath = generateInvoicePDF(order);

    // 2. Perform DB update inside a transaction
    const updatedOrder = await db.transaction(async (tx) => {
      const updatedList = await tx.update(schema.orders)
        .set({
          statusId: approvedStatus.id,
          pdfGeneratedFlag: true,
          pdfFilePath: pdfPath,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, orderId))
        .returning();

      await tx.insert(schema.orderHistory).values({
        orderId: order.id,
        fromStatusId: order.statusId,
        toStatusId: approvedStatus.id,
        changedByUserId: BigInt(userId),
        remarks: currentStatus === 'PENDING_APPROVAL'
          ? 'Order approved. Invoice PDF successfully generated.'
          : 'Order submitted and approved via administrator override.',
      });

      return updatedList[0];
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedOrder),
    });
  } catch (error: any) {
    console.error('Approve order error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
