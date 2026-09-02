import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';
import { saveOrderAttachmentBuffer } from '@/lib/storage';
import path from 'path';

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

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      columns: {
        id: true,
        createdByUserId: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { message: 'Order not found.' } },
        { status: 404 }
      );
    }

    const attachments = await db.query.orderAttachments.findMany({
      where: eq(schema.orderAttachments.orderId, orderId),
      with: {
        approvedByUser: {
          columns: {
            id: true,
            username: true,
            role: true,
          },
        },
        uploadedByUser: {
          columns: {
            id: true,
            username: true,
            role: true,
          },
        },
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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType') as string) || 'PURCHASE_ORDER';

    if (!file) {
      return NextResponse.json(
        { success: false, error: { message: 'No file uploaded.' } },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid file extension. Only .pdf, .png, .jpg, and .jpeg files are allowed.' } },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Uploaded file cannot be empty.' } },
        { status: 400 }
      );
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
    if (buffer.length > maxSizeBytes) {
      return NextResponse.json(
        { success: false, error: { message: 'File size exceeds the 10 MB limit.' } },
        { status: 400 }
      );
    }

    // Sniff magic bytes to ensure file content matches claimed type
    let verifiedMimeType: string | null = null;
    const isPDF = buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF';
    const isPNG = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJPEG = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

    if (isPDF && ext === '.pdf') {
      verifiedMimeType = 'application/pdf';
    } else if (isPNG && ext === '.png') {
      verifiedMimeType = 'image/png';
    } else if (isJPEG && (ext === '.jpg' || ext === '.jpeg')) {
      verifiedMimeType = 'image/jpeg';
    }

    if (!verifiedMimeType) {
      return NextResponse.json(
        { success: false, error: { message: 'File content does not match the expected format. Only authentic PDF, PNG, and JPEG files are allowed.' } },
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

    // Save file locally using storage driver with verified mimeType
    const saved = await saveOrderAttachmentBuffer(id, file.name, buffer, verifiedMimeType, documentType.toLowerCase());

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
