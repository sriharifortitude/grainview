# 2. A chart is a picture with a caption; the table is the data

Status: accepted — 2026-09-18

## Context

There are two schools for accessible charts. One makes every data point
a focusable element with its own label, so a screen reader user can
arrow through the chart the way a sighted user scans it. The other treats
the chart as an image — name it, describe it — and provides the data in
a form built for reading numbers: a table.

The first school produces, for a 90-day daily series, ninety tab stops or
ninety announcements, and still does not convey the shape of the line.

## Decision

- The SVG is `role="img"` with an accessible name (the figcaption) and a
  description generated from the data: how many buckets, from when to
  when, in which zone, the total, the peak and when it happened, and a
  caveat when unique counts are being summed across buckets.
- The numbers are in a `<table>` with a caption, column headers and row
  headers, behind a disclosure button (`aria-expanded`, `aria-controls`).
  The same numbers feed the CSV download.
- The funnel and retention views skip the picture entirely: they are
  tables with visual emphasis added by CSS, because a funnel *is* five
  numbers and a retention matrix *is* a grid.
- After a query runs, focus moves to the results region so a keyboard
  user is not left on the button they pressed, and the region carries
  `aria-busy` while loading.

## Consequences

- A screen reader user gets the gist in one sentence and the detail on
  request, which is the same two speeds a sighted user has.
- The description is generated, so it is never stale and never wrong in
  a way the chart is not. It is also in the tests.
- Colour is never the only channel: groups differ by dash pattern, heat
  cells contain their percentage, funnel bars sit behind their count.
- Sighted users lose hover tooltips. That is a real loss and is listed in
  the README as the first candidate feature; the fix (focusable points
  with a visible tooltip on focus as well as hover) is compatible with
  this decision, not a reversal of it.
