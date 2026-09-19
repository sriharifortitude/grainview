import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';

import { emptyDraft, toSpec } from '@/components/QueryForm';
import { csvLine, resultToCsv } from '@/csv';
import { formatBucket } from '@/charts/format';

const today = Temporal.PlainDate.from('2026-09-18');

describe('emptyDraft', () => {
  it('defaults to the last 30 days inclusive of today', () => {
    const d = emptyDraft(today);
    expect(d.from).toBe('2026-08-20');
    expect(d.to).toBe('2026-09-18');
  });
});

describe('toSpec', () => {
  it('builds a series spec, trimming the event and omitting an empty group', () => {
    const r = toSpec({ ...emptyDraft(today), metric: 'unique', event: ' signup ', bucket: 'week', filterKey: 'plan', filterValue: 'pro' });
    expect(r).toEqual({ spec: { metric: 'unique', event: 'signup', range: { from: '2026-08-20', to: '2026-09-18' }, bucket: 'week', filter: { plan: 'pro' } } });
  });

  it('collects every error with the field it belongs to', () => {
    const r = toSpec({ ...emptyDraft(today), from: '2026-09-20', filterKey: 'bad key', groupBy: 'x;y' });
    expect(r).toEqual({
      errors: {
        to: 'The end date is before the start date.',
        event: 'Choose an event.',
        filterKey: 'Property keys are letters, digits, _ . and - only.',
        filterValue: 'Give the value to match.',
        groupBy: 'Property keys are letters, digits, _ . and - only.',
      },
    });
  });

  it('funnel steps are keyed by index and the window is bounded', () => {
    const r = toSpec({ ...emptyDraft(today), metric: 'funnel', steps: ['view', '', 'buy'], windowDays: 120 });
    expect(r).toEqual({ errors: { step1: 'Choose the event for step 2.', windowDays: 'Window is 1 to 90 days.' } });
    const ok = toSpec({ ...emptyDraft(today), metric: 'funnel', steps: ['view', 'buy'], windowDays: 3 });
    expect(ok).toEqual({ spec: { metric: 'funnel', steps: ['view', 'buy'], range: { from: '2026-08-20', to: '2026-09-18' }, windowDays: 3, filter: {} } });
  });

  it('retention needs both events and a period count in range', () => {
    expect(toSpec({ ...emptyDraft(today), metric: 'retention', periods: 0 })).toEqual({
      errors: { start: 'Choose the event that starts a cohort.', returning: 'Choose the event that counts as returning.', periods: 'Periods is 1 to 26 weeks.' },
    });
  });
});

describe('formatBucket', () => {
  it('never re-parses the label; shows the useful part for each bucket size', () => {
    expect(formatBucket('2025-10-26T02:00:00', 'hour')).toBe('02:00');
    expect(formatBucket('2025-10-26T00:00:00', 'hour')).toBe('10-26');
    expect(formatBucket('2025-10-26T02:00:00', 'hour', true)).toBe('2025-10-26 02:00');
    expect(formatBucket('2025-10-26T00:00:00', 'day')).toBe('10-26');
    expect(formatBucket('2025-10-20T00:00:00', 'week', true)).toBe('2025-10-20');
    expect(formatBucket('2025-10-01T00:00:00', 'month')).toBe('2025-10');
  });
});

describe('csv', () => {
  it('escapes and guards formulas', () => {
    expect(csvLine(['a,b', 'say "hi"', '=1+1', 3, null])).toBe('"a,b","say ""hi""",\'=1+1,3,\r\n');
  });

  it('renders grouped series with a group column', () => {
    const csv = resultToCsv({
      metric: 'count',
      event: 'x',
      bucket: 'day',
      timeZone: 'UTC',
      range: { from: '', to: '' },
      source: 'raw',
      series: [
        { bucket: '2026-09-01T00:00:00', group: 'DE', value: 2 },
        { bucket: '2026-09-01T00:00:00', group: null, value: 1 },
      ],
    });
    expect(csv).toBe('bucket,group,count\r\n2026-09-01T00:00:00,DE,2\r\n2026-09-01T00:00:00,,1\r\n');
  });
});
