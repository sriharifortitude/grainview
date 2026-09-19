import type { Bucket } from '@/api/eventgrain';

const number = new Intl.NumberFormat('en-GB');

export function formatNumber(n: number): string {
  return number.format(n);
}

/**
 * Bucket labels from the API are local wall-clock timestamps with no
 * offset ("2025-10-26T02:00:00"). They are shown as-is in the zone the
 * result names -- never re-parsed into a Date, which would shift them
 * into the browser's zone.
 */
export function formatBucket(label: string, bucket: Bucket, long = false): string {
  const [date = '', time = ''] = label.split('T');
  if (bucket === 'hour') return long ? `${date} ${time.slice(0, 5)}` : time.slice(0, 5) === '00:00' ? date.slice(5) : time.slice(0, 5);
  if (bucket === 'month') return date.slice(0, 7);
  return long ? date : date.slice(5);
}

/** A local date label like "2025-11-03" -> "3 Nov 2025" for cohort headings. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return iso;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
}
