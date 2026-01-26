import { NextRequest, NextResponse } from 'next/server';

import { getPresignedUrl } from '@/lib/b2';

export const runtime = 'nodejs';

/**
 * GET /api/image?key=reports/xxx/123.webp
 * Get a presigned URL for viewing an image
 *
 * Query params: key (required) - The storage key of the image
 * Response: { imageUrl: string }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }

    // Validate that the key is for a report image
    if (!key.startsWith('reports/')) {
      return NextResponse.json({ error: 'Invalid key format' }, { status: 400 });
    }

    // Generate presigned URL (7 days expiration)
    const imageUrl = await getPresignedUrl(key);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Get image URL error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: `Failed to get image URL: ${errorMessage}` }, { status: 500 });
  }
}
