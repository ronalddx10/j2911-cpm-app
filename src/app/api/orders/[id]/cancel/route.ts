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
    
    // Parse body optionally (remarks might not be sent by client)
    let remarks = '';
    try {
      const body = await req.json();
      remarks = body.remarks || '';
    } catch (e) {
      // Body might be empty
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

    // Role-based validations
    if (role === 'ADMIN') {
      if (!remarks) {
        return NextResponse.json(
          { success: false, error: { message: 'Remarks explaining the reason for cancellation are required.' } },
          { status: 400 }
        );
      }
      const currentStatus = order.status.statusName;
      if (currentStatus !== 'PENDING_APPROVAL') {
        return NextResponse.json(
          { success: false, error: { message: 'Only orders pending review can be cancelled by administrators.' } },
          { status: 400 }
        );
      }
    } else {
      // USER role
      if (order.createdByUserId !== BigInt(userId)) {
        return NextResponse.json(
          { success: false, error: { message: 'Not authorized.' } },
          { status: 403 }
        );
      }
      const currentStatus = order.status.statusName;
      if (currentStatus !== 'DRAFT' && currentStatus !== 'PENDING_APPROVAL') {
        return NextResponse.json(
          { success: false, error: { message: 'Only DRAFT or PENDING_APPROVAL orders can be cancelled.' } },
          { status: 400 }
        );
      }
      if (!remarks) {
        remarks = 'Order cancelled by client.';
      }
    }

    const cancelledStatusList = await db.select().from(schema.orderStatuses).where(eq(schema.orderStatuses.statusName, 'CANCELLED')).limit(1);
    const cancelledStatus = cancelledStatusList[0];

    if (!cancelledStatus) {
      return NextResponse.json(
        { success: false, error: { message: 'Status catalog misconfigured.' } },
        { status: 500 }
      );
    }

    const updatedOrder = await db.transaction(async (tx) => {
      const updatedList = await tx.update(schema.orders)
        .set({
          statusId: cancelledStatus.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, orderId))
        .returning();

      await tx.insert(schema.orderHistory).values({
        orderId: order.id,
        fromStatusId: order.statusId,
        toStatusId: cancelledStatus.id,
        changedByUserId: BigInt(userId),
        remarks: role === 'ADMIN' ? `Order cancelled by admin. Reason: ${remarks}` : remarks,
      });

      return updatedList[0];
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedOrder),
    });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
