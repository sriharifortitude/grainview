import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { FunnelResult, RetentionResult, SeriesResult } from '@/api/eventgrain';
import { FunnelChart } from '@/charts/FunnelChart';
import { RetentionGrid } from '@/charts/RetentionGrid';
import { SeriesChart } from '@/charts/SeriesChart';
import { violations } from './axe';

const series: SeriesResult = {
  metric: 'count',
  event: 'signup',
  bucket: 'day',
  timeZone: 'Europe/Berlin',
  range: { from: '2026-09-14T22:00:00Z', to: '2026-09-17T22:00:00Z' },
  source: 'rollup',
  series: [
    { bucket: '2026-09-15T00:00:00', value: 4 },
    { bucket: '2026-09-16T00:00:00', value: 0 },
    { bucket: '2026-09-17T00:00:00', value: 9 },
  ],
};

const grouped: SeriesResult = {
  ...series,
  metric: 'unique',
  source: 'raw',
  series: [
    { bucket: '2026-09-15T00:00:00', group: 'DE', value: 3 },
    { bucket: '2026-09-15T00:00:00', group: 'FR', value: 1 },
    { bucket: '2026-09-16T00:00:00', group: 'DE', value: 2 },
    { bucket: '2026-09-16T00:00:00', group: 'FR', value: 0 },
  ],
};

const funnel: FunnelResult = {
  metric: 'funnel',
  range: { from: '', to: '' },
  windowDays: 3,
  steps: [
    { event: 'view', count: 200, conversion: 1 },
    { event: 'cart', count: 50, conversion: 0.25 },
    { event: 'purchase', count: 20, conversion: 0.1 },
  ],
};

const retention: RetentionResult = {
  metric: 'retention',
  range: { from: '', to: '' },
  timeZone: 'Europe/Berlin',
  cohorts: [
    { cohort: '2025-11-03', size: 3, periods: [1, 2, 1] },
    { cohort: '2025-11-10', size: 1, periods: [0, 1, 0] },
  ],
};

describe('SeriesChart', () => {
  it('has no axe violations and is an image with a name and a data description', async () => {
    const { container } = render(<SeriesChart result={series} />);
    expect(await violations(container)).toEqual([]);
    const img = screen.getByRole('img', { name: 'signup: count per day' });
    expect(img).toHaveAccessibleDescription('3 day buckets from 09-15 to 09-17, Europe/Berlin. Total 13 events. Peak 9 at 09-17.');
  });

  it('exposes the numbers as a table behind a disclosure button', async () => {
    const user = userEvent.setup();
    render(<SeriesChart result={series} />);
    const button = screen.getByRole('button', { name: 'Show data' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[2]).toHaveTextContent('2026-09-16');
    expect(rows[2]).toHaveTextContent('0');
  });

  it('grouped: one line per group with a legend, and the uniques caveat in the description', async () => {
    const { container } = render(<SeriesChart result={grouped} />);
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole('img')).toHaveAccessibleDescription(/summed across buckets; people may repeat/);
    expect(screen.getByRole('img')).toHaveAccessibleDescription(/2 groups/);
    const legend = screen.getByRole('list', { name: 'Groups' });
    expect(legend).toHaveTextContent('DE');
    expect(legend).toHaveTextContent('FR');
    // Two paths, with different dash patterns: colour is not the only difference.
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(2);
    expect(paths[0]?.getAttribute('stroke-dasharray')).toBeNull();
    expect(paths[1]?.getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('says so when there is no data', () => {
    render(<SeriesChart result={{ ...series, series: [] }} />);
    expect(screen.getByRole('img')).toHaveAccessibleDescription('No data in this range.');
  });
});

describe('FunnelChart', () => {
  it('is a table with counts, share of step 1 and share of previous', async () => {
    const { container } = render(<FunnelChart result={funnel} />);
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole('table', { name: /Funnel over 3 days: 200 entered/ })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows[2]).toHaveTextContent('2cart5025%25%');
    expect(rows[3]).toHaveTextContent('3purchase2010%40%');
  });
});

describe('RetentionGrid', () => {
  it('is a table of percentages with the person count for screen readers', async () => {
    const { container } = render(<RetentionGrid result={retention} />);
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole('table', { name: /Weekly retention, 2 cohorts/ })).toBeInTheDocument();
    const firstCohort = screen.getByRole('row', { name: /3 Nov 2025/ });
    expect(firstCohort).toHaveTextContent('33.3% (1 person)');
    expect(firstCohort).toHaveTextContent('66.7% (2 people)');
    const cells = firstCohort.querySelectorAll('td.heat');
    expect(cells[1]?.getAttribute('style')).toContain('--heat: 0.75');
  });
});
