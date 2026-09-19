# 1. Hand-written SVG, no chart library

Status: accepted — 2026-09-18

## Context

The dashboard needs one line chart, one funnel and one retention grid.
The usual move is Recharts, Chart.js or a D3 wrapper. Each brings a
rendering model that decides what is in the DOM, and accessibility then
becomes a matter of what the library exposes and what can be patched on
afterwards. Canvas-based libraries expose nothing; SVG-based ones expose
hundreds of unlabeled shapes.

## Decision

Three components, plain React and SVG, about 150 lines of chart markup
in total, backed by a `scale.ts` module of pure arithmetic (linear scale,
1-2-5 tick generation, path building, label thinning) that is tested with
hand-computed values.

- The **series chart** is one `<svg role="img">` with a `<figcaption>`
  name and an `aria-describedby` sentence. Inside it: gridlines, ticks, a
  `<path>` per group with a dash pattern, and small circles when there
  are few enough points to see them.
- The **funnel** and **retention grid** are HTML tables. A bar and a heat
  fill are CSS on the cell; the numbers are the cell.

## Consequences

- Everything in the DOM is there because it means something. axe finds
  nothing to complain about because there is nothing decorative that
  could be mistaken for content.
- No dependency to track, no theme system to fight, no 300 kB of chart
  code. The bundle is dominated by React and the Temporal polyfill.
- Interactivity is limited to what was written: there are no tooltips,
  no zoom, no brushing. The README lists tooltips as the first thing a
  client would ask for, and the data table as the answer that exists now.
- Adding a fourth chart type is real work, not configuration. For three
  charts that is the right trade; for thirty it would not be.
