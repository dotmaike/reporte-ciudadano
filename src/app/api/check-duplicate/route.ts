import { NextRequest, NextResponse } from 'next/server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  calculateDistance,
  DUPLICATE_DETECTION_RADIUS,
  DUPLICATE_DETECTION_WINDOW,
  encodeGeohash,
  getNeighborGeohashes,
} from '@/lib/location';

export const runtime = 'nodejs';

interface DuplicateCheckRequest {
  lat: number;
  lng: number;
  category: string;
  description?: string;
}

interface ExistingReport {
  id: string;
  category: string;
  description: string;
  status: string;
  distance: number;
  createdAt: string;
  confidence: number;
  level: DuplicateConfidenceLevel;
  reasons: string[];
  textSimilarity: number;
}

type DuplicateConfidenceLevel = 'none' | 'possible' | 'likely';

const POSSIBLE_DUPLICATE_THRESHOLD = 50;
const LIKELY_DUPLICATE_THRESHOLD = 75;
const STRONG_DISTANCE_METERS = 25;
const NEAR_DISTANCE_METERS = DUPLICATE_DETECTION_RADIUS;
const OUTER_DISTANCE_METERS = 100;
const RECENT_REPORT_DAYS = 2;
const CATEGORY_SCORE = 20;
const ACTIVE_STATUS_SCORE = 5;

const STOP_WORDS = new Set([
  'a',
  'al',
  'con',
  'de',
  'del',
  'el',
  'en',
  'esta',
  'este',
  'hay',
  'la',
  'las',
  'lo',
  'los',
  'para',
  'por',
  'que',
  'se',
  'un',
  'una',
  'y',
]);

function getDuplicateLevel(confidence: number): DuplicateConfidenceLevel {
  if (confidence >= LIKELY_DUPLICATE_THRESHOLD) return 'likely';
  if (confidence >= POSSIBLE_DUPLICATE_THRESHOLD) return 'possible';
  return 'none';
}

function getDistanceScore(distance: number): { score: number; reason: string | null } {
  if (distance <= STRONG_DISTANCE_METERS) {
    return { score: 35, reason: `Muy cerca: ${Math.round(distance)} m` };
  }

  if (distance <= NEAR_DISTANCE_METERS) {
    return { score: 28, reason: `Cerca: ${Math.round(distance)} m` };
  }

  if (distance <= OUTER_DISTANCE_METERS) {
    return { score: 14, reason: `Zona cercana: ${Math.round(distance)} m` };
  }

  return { score: 0, reason: null };
}

function getTimeScore(
  reportDate: Date,
  cutoffDate: Date,
): { score: number; reason: string | null } {
  if (reportDate < cutoffDate) return { score: 0, reason: null };

  const ageDays = (Date.now() - reportDate.getTime()) / (24 * 60 * 60 * 1000);

  if (ageDays <= RECENT_REPORT_DAYS) {
    return { score: 20, reason: 'Reportado recientemente' };
  }

  return { score: 12, reason: 'Reportado dentro de la ventana activa' };
}

function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function calculateTextSimilarity(currentDescription = '', existingDescription = ''): number {
  const currentTerms = new Set(normalizeText(currentDescription));
  const existingTerms = new Set(normalizeText(existingDescription));

  if (currentTerms.size === 0 || existingTerms.size === 0) return 0;

  let intersection = 0;
  for (const term of currentTerms) {
    if (existingTerms.has(term)) intersection += 1;
  }

  const union = new Set([...currentTerms, ...existingTerms]).size;
  return union === 0 ? 0 : intersection / union;
}

function getTextScore(similarity: number): { score: number; reason: string | null } {
  if (similarity >= 0.45) {
    return { score: 20, reason: 'Descripción muy parecida' };
  }

  if (similarity >= 0.25) {
    return { score: 12, reason: 'Descripción parcialmente parecida' };
  }

  if (similarity >= 0.12) {
    return { score: 6, reason: 'Algunas palabras coinciden' };
  }

  return { score: 0, reason: null };
}

function scoreDuplicateCandidate({
  categoryMatches,
  currentDescription,
  distance,
  existingDescription,
  reportDate,
  status,
  cutoffDate,
}: {
  categoryMatches: boolean;
  currentDescription?: string;
  distance: number;
  existingDescription?: string;
  reportDate: Date;
  status?: string;
  cutoffDate: Date;
}) {
  const reasons: string[] = [];
  const distanceScore = getDistanceScore(distance);
  const timeScore = getTimeScore(reportDate, cutoffDate);
  const textSimilarity = calculateTextSimilarity(currentDescription, existingDescription);
  const textScore = getTextScore(textSimilarity);
  const activeStatus = status !== 'resolved' && status !== 'rejected';

  if (distanceScore.reason) reasons.push(distanceScore.reason);
  if (categoryMatches) reasons.push('Misma categoría');
  if (timeScore.reason) reasons.push(timeScore.reason);
  if (textScore.reason) reasons.push(textScore.reason);
  if (activeStatus) reasons.push('Reporte aún activo');

  const confidence = Math.min(
    100,
    distanceScore.score +
      (categoryMatches ? CATEGORY_SCORE : 0) +
      timeScore.score +
      textScore.score +
      (activeStatus ? ACTIVE_STATUS_SCORE : 0),
  );

  return {
    confidence,
    level: getDuplicateLevel(confidence),
    reasons,
    textSimilarity,
  };
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
    const { lat, lng, category, description } = body;

    // Validate input
    if (typeof lat !== 'number' || typeof lng !== 'number' || !category) {
      return NextResponse.json(
        { error: 'Invalid request. Required: lat, lng, category' },
        { status: 400 },
      );
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
        .where('geohash', '<', `${geohash}\uf8ff`)
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

        // Score candidates instead of making a binary distance-only decision.
        if (distance <= OUTER_DISTANCE_METERS) {
          const score = scoreDuplicateCandidate({
            categoryMatches: data.category === category,
            currentDescription: description,
            distance,
            existingDescription: data.description,
            reportDate,
            status: data.status,
            cutoffDate,
          });

          potentialDuplicates.push({
            id: doc.id,
            category: data.category,
            description: `${data.description?.substring(0, 100)}...`,
            status: data.status,
            distance: Math.round(distance),
            createdAt: reportDate.toISOString(),
            confidence: score.confidence,
            level: score.level,
            reasons: score.reasons,
            textSimilarity: Number(score.textSimilarity.toFixed(2)),
          });
        }
      }
    }

    // Remove duplicates (same report might appear in multiple geohash queries)
    const uniqueReports = potentialDuplicates.filter(
      (report, index, self) => index === self.findIndex((r) => r.id === report.id),
    );

    const scoredReports = uniqueReports
      .filter((report) => report.level !== 'none')
      .sort((a, b) => b.confidence - a.confidence || a.distance - b.distance);

    const bestConfidence = scoredReports[0]?.confidence ?? 0;
    const bestLevel = getDuplicateLevel(bestConfidence);

    return NextResponse.json({
      hasDuplicates: bestLevel !== 'none',
      level: bestLevel,
      confidence: bestConfidence,
      reports: scoredReports.slice(0, 5), // Return max 5 potential duplicates
      radius: OUTER_DISTANCE_METERS,
      strongRadius: DUPLICATE_DETECTION_RADIUS,
      timeWindow: DUPLICATE_DETECTION_WINDOW / (24 * 60 * 60 * 1000), // in days
      thresholds: {
        possible: POSSIBLE_DUPLICATE_THRESHOLD,
        likely: LIKELY_DUPLICATE_THRESHOLD,
      },
    });
  } catch (error) {
    console.error('Duplicate check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Could not load the default credentials')) {
      return NextResponse.json({
        hasDuplicates: false,
        reports: [],
        message: 'Duplicate check not available',
      });
    }

    return NextResponse.json({ error: `Duplicate check failed: ${errorMessage}` }, { status: 500 });
  }
}
