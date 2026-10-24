## Why

Studio exports composite sheets as `fretzee_sheet` documents. Users need to paste
these exports into a note and retain the configured four-column layout instead
of manually splitting them into separate diagrams.

## What Changes

- Detect full `fretzee_sheet` exports in `fretzee` blocks and provide an equivalent
  `fretzee_sheet` block language.
- Render ordered diagram items in the declared grid with column spans, gaps,
  padding, background, title, and subtitle.
- Apply supported sheet display options before invoking the unchanged core renderer.
- Release version 0.3.0 and update the plugin in the authorized guitar vault.

## Capabilities

### Modified Capabilities
- `obsidian-diagrams`: Adds direct offline rendering of composite sheet exports.

## Impact

Only the standalone plugin and its documentation change. Studio, the core
renderer, user notes, and Guitar Pro files remain unchanged. Nested sheets and
palette overrides are rejected explicitly in this version.
