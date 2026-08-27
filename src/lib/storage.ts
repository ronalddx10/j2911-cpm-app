import fs from 'fs';
import path from 'path';

export interface SavedFileResult {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Modular Storage Driver
 * Currently stores files on the local filesystem under public/uploads/orders/
 * Designed to easily interface with Google Cloud Storage (GCP) or AWS S3 in production.
 */
export async function saveOrderAttachmentFile(
  orderId: string | number,
  file: File,
  prefix: string = 'doc'
): Promise<SavedFileResult> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'orders', String(orderId));
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const timestamp = Date.now();
  const sanitizedOriginal = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const safeFilename = `${prefix}_${timestamp}_${sanitizedOriginal}`;
  const diskPath = path.join(uploadDir, safeFilename);

  fs.writeFileSync(diskPath, buffer);

  const publicUrl = `/uploads/orders/${orderId}/${safeFilename}`;

  return {
    fileName: file.name,
    filePath: publicUrl,
    fileSize: buffer.length,
    mimeType: file.type || 'application/octet-stream',
  };
}
