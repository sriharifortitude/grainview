/**
 * Render the SeriesChart component to a standalone SVG from a live query,
 * for the README. Run with the API up:
 *   EVENTGRAIN_KEY=eg_... npx tsx scripts/render-sample.ts
 * The output is the real component's markup with the stylesheet rules it
 * needs inlined, so the picture in the README is the picture in the app.
 */
import { writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { createClient, type SeriesResult } from '../src/api/eventgrain';
import { SeriesChart } from '../src/charts/SeriesChart';

const key = process.env['EVENTGRAIN_KEY'];
if (key === undefined) throw new Error('EVENTGRAIN_KEY is not set');
const client = createClient(key, process.env['EVENTGRAIN_URL'] ?? 'http://127.0.0.1:4200');

const result = (await client.query({ metric: 'count', event: 'pageview', range: { from: '2026-08-29', to: '2026-09-18' }, bucket: 'day', filter: {}, groupBy: 'country' })) as SeriesResult;
const html = renderToStaticMarkup(createElement(SeriesChart, { result }));
const svg = /<svg[\s\S]*?<\/svg>/.exec(html)?.[0];
if (svg === undefined) throw new Error('no svg in output');

const style = `<style>
  svg { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; }
  .gridline { stroke: #d3d7de; } .tick { font-size: 11px; fill: #4b5262; }
  .series path { stroke-width: 2; fill: none; }
  .series-0 path { stroke: #1a56c4; } .series-0 circle { fill: #1a56c4; }
  .series-1 path { stroke: #a11d1d; } .series-1 circle { fill: #a11d1d; }
</style>`;
// Standalone: the ids the aria attributes point at live in the surrounding figure, not in the file.
const standalone = svg.replace(/ aria-(labelledby|describedby)="[^"]*"/g, '').replace(' role="img"', ' role="img" aria-label="pageview: count per day, grouped by country"');
writeFileSync('docs/sample-series.svg', standalone.replace('>', ` xmlns="http://www.w3.org/2000/svg">${style}`), 'utf8');
console.log(`wrote docs/sample-series.svg (${result.series.length} points, source ${result.source})`);
