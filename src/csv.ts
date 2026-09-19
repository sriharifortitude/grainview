import type { QueryResult } from '@/api/eventgrain';

/** RFC 4180 with the spreadsheet-formula guard; same shapes as eventgrain's own CSV export. */
export function csvLine(fields: ReadonlyArray<string | number | null | undefined>): string {
  return (
    fields
      .map((field) => {
        if (field === null || field === undefined) return '';
        const text = String(field);
        const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
        return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
      })
      .join(',') + '\r\n'
  );
}

export function resultToCsv(result: QueryResult): string {
  switch (result.metric) {
    case 'count':
    case 'unique': {
      const grouped = result.series.some((p) => 'group' in p);
      return csvLine(grouped ? ['bucket', 'group', result.metric] : ['bucket', result.metric]) + result.series.map((p) => csvLine(grouped ? [p.bucket, p.group ?? '', p.value] : [p.bucket, p.value])).join('');
    }
    case 'funnel':
      return csvLine(['step', 'event', 'count', 'conversion']) + result.steps.map((s, i) => csvLine([i + 1, s.event, s.count, s.conversion.toFixed(4)])).join('');
    case 'retention': {
      const periods = result.cohorts[0]?.periods.length ?? 0;
      return csvLine(['cohort', 'size', ...Array.from({ length: periods }, (_, i) => `week_${i}`)]) + result.cohorts.map((c) => csvLine([c.cohort, c.size, ...c.periods])).join('');
    }
  }
}
