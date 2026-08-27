import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-role');
  if (!userId || role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { message: 'Only administrators can approve attachments.' } },
      { status: 403 }
    );
  }

  try {
    const { id, attachmentId } = await context.params;
    const orderId = BigInt(id);
    const attId = BigInt(attachmentId);

    const attachment = await db.query.orderAttachments.findFirst({
      where: and(
        eq(schema.orderAttachments.id, attId),
        eq(schema.orderAttachments.orderId, orderId)
      ),
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: { message: 'Attachment not found.' } },
        { status: 404 }
      );
    }

    const updated = await db.update(schema.orderAttachments)
      .set({
        isApproved: true,
        approvedByUserId: BigInt(userId),
        approvedAt: new Date(),
      })
      .where(eq(schema.orderAttachments.id, attId))
      .returning();

    // Log to order history
    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
    });

    if (order) {
      await db.insert(schema.orderHistory).values({
        orderId,
        fromStatusId: order.statusId,
        toStatusId: order.statusId,
        changedByUserId: BigInt(userId),
        remarks: `Approved attachment: ${attachment.fileName} (${attachment.documentType.replace(/_/g, ' ')})`,
      });
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated[0]),
    });
  } catch (error: any) {
    console.error('Attachment approval error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to approve attachment.' } },
      { status: 500 }
    );
  }
}
