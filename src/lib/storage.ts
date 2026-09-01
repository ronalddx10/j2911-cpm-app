import fs from 'fs';
import path from 'path';

export interface SavedFileResult {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export function getUploadStorageDir(orderId: string | number): string {
  const uploadDir = path.join(process.cwd(), 'storage', 'uploads', 'orders', String(orderId));
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

/**
 * Modular Storage Driver
 * Stores files securely outside public directory under storage/uploads/orders/
 * Accessible only through authenticated API routes.
 */
export async function saveOrderAttachmentBuffer(
  orderId: string | number,
  originalFilename: string,
  buffer: Buffer,
  mimeType: string,
  prefix: string = 'doc'
): Promise<SavedFileResult> {
  const uploadDir = getUploadStorageDir(orderId);

  const timestamp = Date.now();
  const sanitizedOriginal = path.basename(originalFilename).replace(/[^a-zA-Z0-9.-]/g, '_');
  const safeFilename = `${prefix}_${timestamp}_${sanitizedOriginal}`;
  const diskPath = path.join(uploadDir, safeFilename);

  fs.writeFileSync(diskPath, buffer);

  const secureApiUrl = `/api/orders/${orderId}/attachments/file/${encodeURIComponent(safeFilename)}`;

  return {
    fileName: originalFilename,
    filePath: secureApiUrl,
    fileSize: buffer.length,
    mimeType,
  };
}

export async function saveOrderAttachmentFile(
  orderId: string | number,
  file: File,
  prefix: string = 'doc'
): Promise<SavedFileResult> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return saveOrderAttachmentBuffer(orderId, file.name, buffer, file.type || 'application/octet-stream', prefix);
}
