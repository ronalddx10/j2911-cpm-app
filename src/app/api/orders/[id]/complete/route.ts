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

    // Role / Ownership check (P1-5 fix)
    if (role !== 'ADMIN' && order.createdByUserId !== BigInt(userId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Not authorized to complete this order.' } },
        { status: 403 }
      );
    }

    if (order.status.statusName !== 'DELIVERED') {
      return NextResponse.json(
        { success: false, error: { message: 'Only DELIVERED orders can be marked as COMPLETED.' } },
        { status: 400 }
      );
    }

    // Attachment verification (P1-5 fix): Confirm approved signed delivery receipt is attached
    const hasSignedDR = await db.query.orderAttachments.findFirst({
      where: (oa, { and, eq }) => and(
        eq(oa.orderId, orderId),
        eq(oa.documentType, 'SIGNED_DELIVERY_RECEIPT'),
        eq(oa.isApproved, true)
      ),
    });

    if (!hasSignedDR) {
      return NextResponse.json(
        { success: false, error: { message: 'An approved Signed Delivery Receipt (SDR) attachment is required before completing this order.' } },
        { status: 400 }
      );
    }

    const completedStatus = await db.query.orderStatuses.findFirst({
      where: eq(schema.orderStatuses.statusName, 'COMPLETED'),
    });

    if (!completedStatus) {
      return NextResponse.json(
        { success: false, error: { message: 'COMPLETED status is not configured.' } },
        { status: 500 }
      );
    }

    const updated = await db.transaction(async (tx) => {
      const updatedList = await tx.update(schema.orders)
        .set({
          statusId: completedStatus.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, orderId))
        .returning();

      await tx.insert(schema.orderHistory).values({
        orderId,
        fromStatusId: order.statusId,
        toStatusId: completedStatus.id,
        changedByUserId: BigInt(userId),
        remarks: 'Order service COMPLETED with Signed Delivery Receipt. Ready for billing.',
      });

      return updatedList[0];
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Order complete error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update order status.' } },
      { status: 500 }
    );
  }
}
