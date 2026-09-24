import { NextRequest, NextResponse } from 'next/server';

import { generateImageKey, getPresignedUrl, uploadToB2 } from '@/lib/b2';

export const runtime = 'nodejs';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const REPORT_ID_PATTERN = /^[a-zA-Z0-9_-]{6,128}$/;

/**
 * POST /api/upload
 * Upload an image to B2 storage and return a presigned URL
 *
 * Request body: FormData with 'file' and 'reportId' fields
 * Response: { imageUrl: string, key: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const reportId = formData.get('reportId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!reportId) {
      return NextResponse.json({ error: 'No reportId provided' }, { status: 400 });
    }

    if (!REPORT_ID_PATTERN.test(reportId)) {
      return NextResponse.json(
        { error: 'Invalid reportId. Use 6-128 letters, numbers, dashes or underscores.' },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP' },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size: 10MB' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate storage key and upload
    const key = generateImageKey(reportId, file.type);
    await uploadToB2(key, buffer, file.type);

    // Generate presigned URL for viewing (7 days expiration)
    const imageUrl = await getPresignedUrl(key);

    return NextResponse.json({
      imageUrl,
      key,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: `Upload failed: ${errorMessage}` }, { status: 500 });
  }
}
