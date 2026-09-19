/**
 * The arithmetic behind the charts, kept free of React and the DOM so it
 * can be tested with pencil-and-paper expectations.
 */

export interface Linear {
  readonly domain: readonly [number, number];
  readonly range: readonly [number, number];
}

/** Map `value` from domain to range. A degenerate domain maps everything to range[0]. */
export function scale(s: Linear, value: number): number {
  const [d0, d1] = s.domain;
  const [r0, r1] = s.range;
  if (d1 === d0) return r0;
  // Two decimals: enough for any viewBox, and keeps 345.40000000000003 out of the markup.
  return Math.round((r0 + ((value - d0) / (d1 - d0)) * (r1 - r0)) * 100) / 100;
}

/**
 * "Nice" tick values for a y axis: about `count` ticks at a step of
 * 1, 2 or 5 times a power of ten, starting at zero for counts. The top
 * tick is at or above the maximum so the largest value never touches
 * the frame.
 */
export function ticks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10) * magnitude;
  const out: number[] = [];
  for (let v = 0; v < max + step; v += step) out.push(round(v));
  return out;
}

function round(v: number): number {
  return Number(v.toPrecision(12));
}

/** SVG path for a polyline through points, or "" for fewer than one point. */
export function linePath(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`).join('');
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Choose which of `n` category labels to draw so that at most `maxLabels` appear, evenly, always the first and last. */
export function labelIndices(n: number, maxLabels: number): number[] {
  if (n <= maxLabels) return Array.from({ length: n }, (_, i) => i);
  const stride = Math.ceil((n - 1) / (maxLabels - 1));
  const out: number[] = [];
  for (let i = 0; i < n; i += stride) out.push(i);
  if (out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
}

/** 0–1 value to a 4-step opacity for the retention heatmap: never fully transparent when > 0. */
export function heatOpacity(ratio: number): number {
  if (ratio <= 0) return 0;
  if (ratio < 0.25) return 0.25;
  if (ratio < 0.5) return 0.5;
  if (ratio < 0.75) return 0.75;
  return 1;
}

/** Percent with one decimal, no trailing ".0". */
export function percent(ratio: number): string {
  const p = Math.round(ratio * 1000) / 10;
  return `${Number.isInteger(p) ? p.toFixed(0) : p.toFixed(1)}%`;
}
