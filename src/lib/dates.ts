import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Timestamp } from 'firebase/firestore';

/**
 * Converts a Firestore Timestamp or Date to a JavaScript Date object
 * Returns null if the input is invalid
 */
export function toDate(timestamp: Timestamp | Date | null | undefined): Date | null {
  if (!timestamp) return null;

  // If it's already a Date object
  if (timestamp instanceof Date) {
    return isValid(timestamp) ? timestamp : null;
  }

  // If it's a Firestore Timestamp
  if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  return null;
}

/**
 * Formats a Firestore Timestamp or Date to a localized Spanish date string
 * Example: "22 de enero de 2026, 14:30"
 */
export function formatDate(
  timestamp: Timestamp | Date | null | undefined,
  formatString = "d 'de' MMMM 'de' yyyy, HH:mm",
): string {
  const date = toDate(timestamp);
  if (!date) return 'N/A';

  return format(date, formatString, { locale: es });
}

/**
 * Formats a Firestore Timestamp or Date to a short date string
 * Example: "22/01/2026"
 */
export function formatShortDate(timestamp: Timestamp | Date | null | undefined): string {
  const date = toDate(timestamp);
  if (!date) return 'N/A';

  return format(date, 'dd/MM/yyyy', { locale: es });
}

/**
 * Formats a Firestore Timestamp or Date to a relative time string
 * Example: "hace 2 horas", "hace 3 días"
 */
export function formatRelativeTime(timestamp: Timestamp | Date | null | undefined): string {
  const date = toDate(timestamp);
  if (!date) return 'N/A';

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: es,
  });
}

/**
 * Formats a Firestore Timestamp or Date to an ISO 8601 string
 * Useful for datetime-local inputs or API communication
 */
export function formatISO(timestamp: Timestamp | Date | null | undefined): string | null {
  const date = toDate(timestamp);
  if (!date) return null;

  return date.toISOString();
}

/**
 * Parses an ISO 8601 string to a Date object
 * Returns null if parsing fails
 */
export function parseISOString(isoString: string | null | undefined): Date | null {
  if (!isoString) return null;

  const date = parseISO(isoString);
  return isValid(date) ? date : null;
}

/**
 * Formats a date for display in the admin dashboard
 * Example: "22 de enero de 2026, 14:30"
 */
export function formatAdminDate(timestamp: Timestamp | Date | null | undefined): string {
  return formatDate(timestamp, "d 'de' MMMM 'de' yyyy, HH:mm");
}

/**
 * Formats a date for display in reports
 * Shows both absolute and relative time
 * Example: "22/01/2026 (hace 2 horas)"
 */
export function formatReportDate(timestamp: Timestamp | Date | null | undefined): string {
  const date = toDate(timestamp);
  if (!date) return 'N/A';

  const shortDate = formatShortDate(timestamp);
  const relativeTime = formatRelativeTime(timestamp);

  return `${shortDate} (${relativeTime})`;
}
