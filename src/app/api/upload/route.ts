import { NextRequest, NextResponse } from 'next/server';

import { generateImageKey, getPresignedUrl, uploadToB2 } from '@/lib/b2';

export const runtime = 'nodejs';

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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size: 10MB' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate storage key and upload
    const key = generateImageKey(reportId, file.name);
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
