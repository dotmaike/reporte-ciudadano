import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { getAdminFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const CATEGORIES = [
  'pothole',
  'lighting',
  'water_leak',
  'garbage',
  'civil_protection',
  'animal_welfare',
] as const;

type ReportCategory = (typeof CATEGORIES)[number];

type CreateReportRequest = {
  reportId: string;
  category: ReportCategory;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  imageUrl: string;
  imageKey: string;
  geohash: string;
};

const REPORT_ID_PATTERN = /^[a-zA-Z0-9_-]{6,128}$/;

function isValidCategory(value: unknown): value is ReportCategory {
  return typeof value === 'string' && CATEGORIES.includes(value as ReportCategory);
}

function validatePayload(body: Partial<CreateReportRequest>): string | null {
  if (!body.reportId || !REPORT_ID_PATTERN.test(body.reportId)) {
    return 'Invalid reportId';
  }

  if (!isValidCategory(body.category)) {
    return 'Invalid category';
  }

  if (
    typeof body.description !== 'string' ||
    body.description.length < 10 ||
    body.description.length > 500
  ) {
    return 'Invalid description';
  }

  if (
    !body.location ||
    typeof body.location.lat !== 'number' ||
    typeof body.location.lng !== 'number'
  ) {
    return 'Invalid location';
  }

  if (typeof body.imageUrl !== 'string' || body.imageUrl.length === 0) {
    return 'Invalid imageUrl';
  }

  if (typeof body.imageKey !== 'string' || body.imageKey.length === 0) {
    return 'Invalid imageKey';
  }

  if (typeof body.geohash !== 'string' || body.geohash.length === 0) {
    return 'Invalid geohash';
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Partial<CreateReportRequest>;
    const validationError = validatePayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const report = body as CreateReportRequest;
    const db = getAdminFirestore();

    await db.collection('reports').doc(report.reportId).create({
      id: report.reportId,
      category: report.category,
      description: report.description,
      location: report.location,
      imageUrl: report.imageUrl,
      imageKey: report.imageKey,
      geohash: report.geohash,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      reportId: report.reportId,
      message: 'Report created successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (errorMessage.includes('ALREADY_EXISTS') || errorMessage.includes('already exists')) {
      return NextResponse.json({ error: 'Report already exists' }, { status: 409 });
    }

    if (errorMessage.includes('Could not load the default credentials')) {
      return NextResponse.json(
        {
          error:
            'No se pudo guardar el reporte porque Firebase Admin no tiene credenciales configuradas.',
        },
        { status: 503 },
      );
    }

    if (errorMessage.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { error: 'No se pudo guardar el reporte por permisos insuficientes de Firebase.' },
        { status: 403 },
      );
    }

    console.error('Firestore report creation error:', error);
    return NextResponse.json({ error: `Report creation failed: ${errorMessage}` }, { status: 500 });
  }
}
