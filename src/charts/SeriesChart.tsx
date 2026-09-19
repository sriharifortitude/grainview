import { useId, useState } from 'react';

import type { SeriesResult } from '@/api/eventgrain';
import { labelIndices, linePath, scale, ticks } from './scale';
import { formatBucket, formatNumber } from './format';

/**
 * A line chart that a screen reader user can also read.
 *
 * The SVG is `role="img"` with a name and a one-sentence description of
 * the data (range, total, peak). It is a picture, and a picture needs a
 * caption, not a hundred focusable circles. The full numbers are in a real
 * table under a "Show data" toggle, which is the same data the CSV
 * download uses. Colour is never the only channel: with several groups,
 * each line also has a distinct dash pattern and the legend names both.
 */

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 36, left: 52 };
const DASHES = ['', '6 4', '2 3', '10 4 2 4', '1 4'];

export function SeriesChart({ result }: { readonly result: SeriesResult }): React.JSX.Element {
  const titleId = useId();
  const descId = useId();
  const tableId = useId();
  const [showData, setShowData] = useState(false);

  const buckets = [...new Set(result.series.map((p) => p.bucket))];
  const groups = [...new Set(result.series.map((p) => p.group ?? null))];
  const grouped = groups.length > 1 || (groups.length === 1 && groups[0] !== null);
  const max = Math.max(0, ...result.series.map((p) => p.value));
  const yTicks = ticks(max);
  const yMax = yTicks[yTicks.length - 1] ?? 1;

  const x = { domain: [0, Math.max(1, buckets.length - 1)] as const, range: [PAD.left, WIDTH - PAD.right] as const };
  const y = { domain: [0, yMax] as const, range: [HEIGHT - PAD.bottom, PAD.top] as const };

  const lines = groups.map((group, gi) => {
    const points = buckets.map((bucket, i) => {
      const point = result.series.find((p) => p.bucket === bucket && (p.group ?? null) === group);
      return [scale(x, i), scale(y, point?.value ?? 0)] as const;
    });
    return { group, dash: DASHES[gi % DASHES.length] ?? '', path: linePath(points), points };
  });

  const total = result.series.reduce((sum, p) => sum + p.value, 0);
  const peak = result.series.reduce((best, p) => (p.value > best.value ? p : best), { bucket: '', value: -1 });
  const metricWord = result.metric === 'count' ? 'events' : 'unique people';
  const title = `${result.event}: ${result.metric === 'count' ? 'count' : 'unique people'} per ${result.bucket}`;
  const description =
    buckets.length === 0
      ? 'No data in this range.'
      : `${buckets.length} ${result.bucket} buckets from ${formatBucket(buckets[0] ?? '', result.bucket)} to ${formatBucket(buckets[buckets.length - 1] ?? '', result.bucket)}, ${result.timeZone}. ` +
        `Total ${formatNumber(total)} ${metricWord}${result.metric === 'unique' && buckets.length > 1 ? ' (summed across buckets; people may repeat)' : ''}. ` +
        `Peak ${formatNumber(peak.value)} at ${formatBucket(peak.bucket, result.bucket)}.` +
        (grouped ? ` ${groups.length} groups.` : '');

  const labelAt = new Set(labelIndices(buckets.length, 8));

  return (
    <figure className="chart">
      <figcaption id={titleId}>{title}</figcaption>
      <p id={descId} className="chart-description">
        {description}
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={titleId} aria-describedby={descId} className="chart-svg">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={scale(y, tick)} y2={scale(y, tick)} className="gridline" />
            <text x={PAD.left - 8} y={scale(y, tick)} textAnchor="end" dominantBaseline="middle" className="tick">
              {formatNumber(tick)}
            </text>
          </g>
        ))}
        {buckets.map((bucket, i) =>
          labelAt.has(i) ? (
            <text key={bucket} x={scale(x, i)} y={HEIGHT - PAD.bottom + 18} textAnchor="middle" className="tick">
              {formatBucket(bucket, result.bucket)}
            </text>
          ) : null,
        )}
        {lines.map((line, gi) => (
          <g key={line.group ?? '__all'} className={`series series-${gi % DASHES.length}`}>
            <path d={line.path} fill="none" strokeDasharray={line.dash || undefined} />
            {buckets.length <= 40 && line.points.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={3} />)}
          </g>
        ))}
      </svg>
      {grouped && (
        <ul className="legend" aria-label="Groups">
          {lines.map((line, gi) => (
            <li key={line.group ?? '__all'} className={`series-${gi % DASHES.length}`}>
              <svg width="28" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="28" y2="5" strokeDasharray={line.dash || undefined} />
              </svg>
              {line.group ?? '(none)'}
            </li>
          ))}
        </ul>
      )}
      <p>
        <button type="button" aria-expanded={showData} aria-controls={tableId} onClick={() => setShowData((v) => !v)}>
          {showData ? 'Hide data' : 'Show data'}
        </button>
      </p>
      <div id={tableId} hidden={!showData}>
        <table>
          <caption>{title}, as numbers</caption>
          <thead>
            <tr>
              <th scope="col">Bucket ({result.timeZone})</th>
              {grouped ? groups.map((g) => <th key={g ?? '__none'} scope="col">{g ?? '(none)'}</th>) : <th scope="col">{metricWord}</th>}
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket}>
                <th scope="row">{formatBucket(bucket, result.bucket, true)}</th>
                {groups.map((g) => (
                  <td key={g ?? '__none'}>{formatNumber(result.series.find((p) => p.bucket === bucket && (p.group ?? null) === g)?.value ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
