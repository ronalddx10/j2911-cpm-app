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

    if (order.status.statusName !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: { message: 'Only APPROVED orders can be marked as DELIVERED.' } },
        { status: 400 }
      );
    }

    const deliveredStatus = await db.query.orderStatuses.findFirst({
      where: eq(schema.orderStatuses.statusName, 'DELIVERED'),
    });

    if (!deliveredStatus) {
      return NextResponse.json(
        { success: false, error: { message: 'DELIVERED status is not configured.' } },
        { status: 500 }
      );
    }

    const updated = await db.transaction(async (tx) => {
      const updatedList = await tx.update(schema.orders)
        .set({
          statusId: deliveredStatus.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, orderId))
        .returning();

      await tx.insert(schema.orderHistory).values({
        orderId,
        fromStatusId: order.statusId,
        toStatusId: deliveredStatus.id,
        changedByUserId: BigInt(userId),
        remarks: 'Order dispatched & marked as DELIVERED.',
      });

      return updatedList[0];
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Order deliver error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update order status.' } },
      { status: 500 }
    );
  }
}
