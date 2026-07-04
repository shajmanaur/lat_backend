import * as fs from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';

export function saveBase64File(base64: string, uploadFolder: string): string {
  if (!base64) return null;

  // Ensure folder exists
  if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
  }

  // Validate Base64 format
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new BadRequestException('Invalid base64 image format');

  const mimeType = matches[1];
  const ext = mimeType.split('/')[1]; // Example: image/png → png
  const base64Data = matches[2];

  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = `profile-${uniqueSuffix}.${ext}`;
  const filePath = join(uploadFolder, filename);

  // Save file
  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

  return filename; // Return filename for DB
}
