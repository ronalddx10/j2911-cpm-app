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

  // Admin only for marking paid
  if (role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { message: 'Only administrators can mark orders as paid.' } },
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

    if (order.status.statusName !== 'COMPLETED' && order.status.statusName !== 'APPROVED' && order.status.statusName !== 'DELIVERED') {
      return NextResponse.json(
        { success: false, error: { message: 'Only active or completed orders can be marked as PAID.' } },
        { status: 400 }
      );
    }

    const paidStatus = await db.query.orderStatuses.findFirst({
      where: eq(schema.orderStatuses.statusName, 'PAID'),
    });

    if (!paidStatus) {
      return NextResponse.json(
        { success: false, error: { message: 'PAID status is not configured.' } },
        { status: 500 }
      );
    }

    const updated = await db.transaction(async (tx) => {
      const updatedList = await tx.update(schema.orders)
        .set({
          statusId: paidStatus.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, orderId))
        .returning();

      await tx.insert(schema.orderHistory).values({
        orderId,
        fromStatusId: order.statusId,
        toStatusId: paidStatus.id,
        changedByUserId: BigInt(userId),
        remarks: 'Payment acknowledged & order marked as PAID.',
      });

      return updatedList[0];
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Order pay error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update order status.' } },
      { status: 500 }
    );
  }
}
