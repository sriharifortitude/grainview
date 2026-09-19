# Accessibility statement

grainview is built to WCAG 2.2 Level AA. This file separates what the
automated suite verifies, what was checked by inspection, and what still
needs a browser and assistive technology before a production deployment.

## Verified by automated tests (`npm run test:a11y`)

- No axe-core violations on the API-key gate, the query form, the series
  chart (single and grouped), the funnel table and the retention grid.
- The series chart is an image with an accessible name and a generated
  description containing range, zone, total and peak; with no data it
  says so.
- The data table is behind a disclosure with `aria-expanded` and
  `aria-controls`; its rows carry the same numbers as the chart.
- Grouped series have distinct dash patterns, not only colours, and a
  legend list named "Groups".
- The funnel and retention views are real tables with captions, column
  and row headers; retention cells include the person count for screen
  readers alongside the percentage.
- Form validation happens on submit, lists every error in a `role="alert"`
  region with links to the fields, marks fields `aria-invalid`, and
  focuses the first invalid field. The API is not called when the form
  is invalid.
- After a successful query, focus moves to the results region.
- A rejected API key returns to the gate with the reason in an alert.

## Verified by inspection

- Contrast: text 17.8:1, muted text 7.8:1, accent with white 6.6:1,
  control borders 4.6:1, error text on its background 6.7:1 — computed
  with the WCAG formula, listed in `styles.css`. Series colours
  (#1a56c4, #a11d1d, #1f7a3a, #7a4b00, #5b2a86) are each at least 4.5:1
  on white, and are paired with dash patterns.
- Focus ring: 3 px near-black, offset 2 px, with a white gap beneath, on
  every focusable element including the results region.
- The layout collapses to one column below 52rem; nothing depends on a
  pointer.

## Not verified — needed before a production deployment

- Screen reader walk-throughs (NVDA, JAWS, VoiceOver, TalkBack). In
  particular, how each reader announces the SVG description, and whether
  `dominant-baseline` text inside the SVG is ignored as intended.
- Reflow at 320 px and zoom at 200%/400% in a real layout engine; the
  SVG scales with its container but the axis labels do not, and may
  overlap at small widths.
- Native `<input type="date">` behaviour varies by browser and is a
  known weak point for screen reader users in some combinations; a custom
  date picker (see openslot's calendar) would be the replacement.
- Voice control.
- The heat fill on retention cells uses `color-mix`, which needs a 2023+
  browser; older browsers show plain cells with the percentages intact.

## Reporting a problem

Open an issue with the assistive technology, browser and steps.
