## Context

The existing `fretzee` processor accepts a single configuration. The supplied
Studio export wraps its sheet under `sheet` and contains four `items` with
configuration objects, duplicate payloads, and untrusted thumbnail SVG strings.

## Goals / Non-Goals

Goals: paste the full export unchanged, retain its four columns and spacing,
render all items offline, preserve exact core SVG output, and update the installed
plugin with a backup. Non-goals: nesting sheets, palette overrides, Studio IDs,
changing the shared renderer, and creating or modifying notes in the vault.

## Decisions

- Use CSS Grid for composition and isolated SVG images for individual diagrams.
  This preserves each core SVG unchanged and avoids duplicating Studio's SVG
  composition engine inside the independently licensed plugin.
- Accept exported `fretzee_sheet` wrappers and canonical sheet objects. Existing
  `fretzee` blocks detect sheets automatically; `fretzee_sheet` is an alias.
- Respect declared columns even on narrow notes. Use `minmax(0, 1fr)` and shrinkable
  cells; scale images to fit without wrapping to fewer columns.
- Retain layout gaps, padding, background, alignment, item order and column spans.
  Apply orientation and uniform-spacing overrides as renderer input. Item labels
  and visibility flags are applied before rendering, never by editing SVG output.
- Ignore thumbnails, IDs, and duplicate payloads when a configuration is present.
  Read text using DOM textContent and background through a single CSS color property.
- Keep the existing source-size limit and bound sheets to 64 diagrams and 8 columns.
  Reject unsupported or malformed fields with local errors rather than defaults.

## Risks / Trade-offs

A CSS-composed sheet is a group of SVG images, not a single exportable SVG. Four
columns can become small in narrow panes, but preserve the author's layout. As
with individual diagrams, configured colors are preserved across themes.

## Verification Plan

Test multirow grids, spans, layout options, input immutability, core SVG equality,
unsafe metadata, invalid input, and diagram/tablature regressions. Render the
supplied export in a real browser and measure its four columns. Run TypeScript,
lint, tests, packaging, strict OpenSpec, and verify installed-file checksums.
