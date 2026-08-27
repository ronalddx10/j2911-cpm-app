import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';
import { saveOrderAttachmentFile } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const orderId = BigInt(id);

    const attachments = await db.query.orderAttachments.findMany({
      where: eq(schema.orderAttachments.orderId, orderId),
      with: {
        approvedByUser: true,
        uploadedByUser: true,
      },
      orderBy: [desc(schema.orderAttachments.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(attachments),
    });
  } catch (error: any) {
    console.error('Attachments fetch error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'An internal error occurred.' } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-role');
  if (!userId) {
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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType') as string) || 'PURCHASE_ORDER';

    if (!file) {
      return NextResponse.json(
        { success: false, error: { message: 'No file uploaded.' } },
        { status: 400 }
      );
    }

    const validTypes = ['PURCHASE_ORDER', 'DELIVERY_RECEIPT', 'SIGNED_DELIVERY_RECEIPT', 'OTHER'];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { success: false, error: { message: `Invalid document type. Must be one of: ${validTypes.join(', ')}.` } },
        { status: 400 }
      );
    }

    // Save file locally using storage driver
    const saved = await saveOrderAttachmentFile(id, file, documentType.toLowerCase());

    // Auto-approve if uploaded by admin
    const isAdmin = role === 'ADMIN';

    const insertedAttachments = await db.insert(schema.orderAttachments).values({
      orderId,
      documentType,
      fileName: saved.fileName,
      filePath: saved.filePath,
      fileSize: saved.fileSize,
      mimeType: saved.mimeType,
      isApproved: isAdmin,
      approvedByUserId: isAdmin ? BigInt(userId) : null,
      approvedAt: isAdmin ? new Date() : null,
      uploadedByUserId: BigInt(userId),
    }).returning();

    const attachment = insertedAttachments[0];

    // Log to order history
    await db.insert(schema.orderHistory).values({
      orderId,
      fromStatusId: order.statusId,
      toStatusId: order.statusId,
      changedByUserId: BigInt(userId),
      remarks: `Uploaded ${documentType.replace(/_/g, ' ')}: ${saved.fileName}${isAdmin ? ' (Auto-approved by Admin)' : ''}`,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(attachment),
    });
  } catch (error: any) {
    console.error('Attachment upload error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to upload attachment.' } },
      { status: 500 }
    );
  }
}
