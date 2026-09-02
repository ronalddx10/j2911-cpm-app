import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { getUploadStorageDir } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; filename: string }> }
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
    const { id, filename } = await context.params;
    const orderId = BigInt(id);
    const sanitizedFilename = path.basename(decodeURIComponent(filename));

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

    const uploadDir = getUploadStorageDir(id);
    const diskPath = path.join(uploadDir, sanitizedFilename);

    if (!fs.existsSync(diskPath)) {
      return NextResponse.json(
        { success: false, error: { message: 'File not found.' } },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(diskPath);
    const ext = path.extname(sanitizedFilename).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
      },
    });
  } catch (error: any) {
    console.error('Attachment file download error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to retrieve file.' } },
      { status: 500 }
    );
  }
}
