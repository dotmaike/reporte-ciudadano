import { cert,getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import {
  calculateDistance,
  DUPLICATE_DETECTION_RADIUS,
  DUPLICATE_DETECTION_WINDOW,
  encodeGeohash,
  getNeighborGeohashes,
} from '@/lib/location';

export const runtime = 'nodejs';

// Initialize Firebase Admin SDK for server-side Firestore access
// This allows querying without exposing credentials to the client
function getAdminFirestore() {
  if (getApps().length === 0) {
    // For local development, use the default credentials
    // In production, use service account or ADC
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

interface DuplicateCheckRequest {
  lat: number;
  lng: number;
  category: string;
}

interface ExistingReport {
  id: string;
  category: string;
  description: string;
  status: string;
  distance: number;
  createdAt: string;
}

/**
 * POST /api/check-duplicate
 * Check for potential duplicate reports based on location and category
 *
 * Request body: { lat: number, lng: number, category: string }
 * Response: { hasDuplicates: boolean, reports: ExistingReport[] }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: DuplicateCheckRequest = await request.json();
    const { lat, lng, category } = body;

    // Validate input
    if (typeof lat !== 'number' || typeof lng !== 'number' || !category) {
      return NextResponse.json(
        { error: 'Invalid request. Required: lat, lng, category' },
        { status: 400 },
      );
    }

    // Check if Firebase Admin credentials are available
    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      // Fall back to a simpler check without server-side Firestore
      // This means duplicate detection won't work, but the form still functions
      console.warn('Firebase Admin credentials not configured. Duplicate check disabled.');
      return NextResponse.json({
        hasDuplicates: false,
        reports: [],
        message: 'Duplicate check not available',
      });
    }

    const db = getAdminFirestore();

    // Calculate geohash for the location
    const centerGeohash = encodeGeohash(lat, lng);
    const searchGeohashes = getNeighborGeohashes(centerGeohash);

    // Calculate the time window cutoff
    const cutoffDate = new Date(Date.now() - DUPLICATE_DETECTION_WINDOW);

    // Query reports with matching geohash prefix and category
    // We query for reports in the center cell and all 8 neighbors
    const potentialDuplicates: ExistingReport[] = [];

    for (const geohash of searchGeohashes) {
      const snapshot = await db
        .collection('reports')
        .where('geohash', '>=', geohash)
        .where('geohash', '<', `${geohash  }\uf8ff`)
        .where('category', '==', category)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const reportDate = data.createdAt?.toDate?.() || new Date(data.createdAt);

        // Skip reports outside the time window
        if (reportDate < cutoffDate) continue;

        // Skip resolved or rejected reports
        if (data.status === 'resolved' || data.status === 'rejected') continue;

        // Calculate actual distance
        const distance = calculateDistance(lat, lng, data.location.lat, data.location.lng);

        // Only include reports within the detection radius
        if (distance <= DUPLICATE_DETECTION_RADIUS) {
          potentialDuplicates.push({
            id: doc.id,
            category: data.category,
            description: `${data.description?.substring(0, 100)  }...`,
            status: data.status,
            distance: Math.round(distance),
            createdAt: reportDate.toISOString(),
          });
        }
      }
    }

    // Remove duplicates (same report might appear in multiple geohash queries)
    const uniqueReports = potentialDuplicates.filter(
      (report, index, self) => index === self.findIndex((r) => r.id === report.id),
    );

    // Sort by distance
    uniqueReports.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      hasDuplicates: uniqueReports.length > 0,
      reports: uniqueReports.slice(0, 5), // Return max 5 potential duplicates
      radius: DUPLICATE_DETECTION_RADIUS,
      timeWindow: DUPLICATE_DETECTION_WINDOW / (24 * 60 * 60 * 1000), // in days
    });
  } catch (error) {
    console.error('Duplicate check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Duplicate check failed: ${errorMessage}` }, { status: 500 });
  }
}
