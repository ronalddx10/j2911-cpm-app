import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';

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
      { success: false, error: { message: 'Only administrators can return orders for update.' } },
      { status: 403 }
    );
  }

  try {
    const { id } = await context.params;
    const orderId = BigInt(id);
    const { remarks } = await req.json();

    if (!remarks) {
      return NextResponse.json(
        { success: false, error: { message: 'Remarks explaining what needs updating are required.' } },
        { status: 400 }
      );
    }

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      with: { status: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { message: 'Order not found.' } },
        { status: 404 }
      );
    }

    const currentStatus = order.status.statusName;
    if (currentStatus !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { success: false, error: { message: 'Only orders pending review can be returned for update.' } },
        { status: 400 }
      );
    }

    const forUpdateStatusList = await db.select().from(schema.orderStatuses).where(eq(schema.orderStatuses.statusName, 'FOR_UPDATE')).limit(1);
    const forUpdateStatus = forUpdateStatusList[0];

    if (!forUpdateStatus) {
      return NextResponse.json(
        { success: false, error: { message: 'Status catalog misconfigured.' } },
        { status: 500 }
      );
    }

    const updatedOrder = await db.transaction(async (tx) => {
      const updatedList = await tx.update(schema.orders)
        .set({
          statusId: forUpdateStatus.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, orderId))
        .returning();

      await tx.insert(schema.orderHistory).values({
        orderId: order.id,
        fromStatusId: order.statusId,
        toStatusId: forUpdateStatus.id,
        changedByUserId: BigInt(userId),
        remarks: `Order returned for updates. Guidance: ${remarks}`,
      });

      return updatedList[0];
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedOrder),
    });
  } catch (error: any) {
    console.error('Return order error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
