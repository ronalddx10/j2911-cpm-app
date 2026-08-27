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

  // Matrix check: User only
  if (role !== 'USER') {
    return NextResponse.json(
      { success: false, error: { message: 'Admins cannot submit order requests.' } },
      { status: 403 }
    );
  }

  try {
    const { id } = await context.params;
    const orderId = BigInt(id);

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

    // RLS
    if (order.createdByUserId !== BigInt(userId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Not authorized.' } },
        { status: 403 }
      );
    }

    const currentStatus = order.status.statusName;
    if (currentStatus !== 'DRAFT' && currentStatus !== 'FOR_UPDATE') {
      return NextResponse.json(
        { success: false, error: { message: 'Only DRAFT or FOR_UPDATE orders can be submitted.' } },
        { status: 400 }
      );
    }

    const pendingStatusList = await db.select().from(schema.orderStatuses).where(eq(schema.orderStatuses.statusName, 'PENDING_APPROVAL')).limit(1);
    const pendingStatus = pendingStatusList[0];

    if (!pendingStatus) {
      return NextResponse.json(
        { success: false, error: { message: 'Status catalog misconfigured.' } },
        { status: 500 }
      );
    }

    const updatedOrder = await db.transaction(async (tx) => {
      const updatedList = await tx.update(schema.orders)
        .set({
          statusId: pendingStatus.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, orderId))
        .returning();

      await tx.insert(schema.orderHistory).values({
        orderId: order.id,
        fromStatusId: order.statusId,
        toStatusId: pendingStatus.id,
        changedByUserId: BigInt(userId),
        remarks: 'Order submitted for approval.',
      });

      return updatedList[0];
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedOrder),
    });
  } catch (error: any) {
    console.error('Submit order error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
