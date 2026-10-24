# ADR-0002: Compose sheet diagrams with CSS Grid

* **Status**: Accepted
* **Deciders**: Sébastien Ferry
* **Date**: 2026-10-24

## Context and Problem Statement

Users paste complete Studio sheet exports and expect four columns to be retained
inside Obsidian notes. The plugin must keep its offline operation, its independent
license, and the shared renderer's SVG drawing intact.

## Decision Drivers

* Preserve declared layout, item order, configured colors and core output.
* Avoid copying the Studio SVG composition implementation.
* Avoid injecting cached thumbnails or untrusted markup into notes.

## Considered Options

* Compose separate core-rendered SVG images using CSS Grid.
* Reimplement the Studio's single-SVG layout engine in the plugin.
* Flatten each exported sheet into unrelated Markdown blocks.

## Decision Outcome

Use CSS Grid with a fixed declared column count, `minmax(0, 1fr)` tracks and
shrinkable cells. Apply supported item/visibility/orientation options as input to
the core renderer; preserve each resulting SVG unchanged in an image data URL.
Use safe text nodes for headers and a single validated CSS color for backgrounds.

### Positive Consequences

* The original export works without conversion or a Studio connection.
* Four columns, spans, gaps and padding remain explicit in narrow panes.
* Core SVG rendering stays centralized in the published Fretzee package.

### Negative Consequences

* A sheet is composed of several images rather than one exportable SVG.
* Narrow panes can make diagrams small, and configured colors remain unchanged.
* Nested sheets and palette overrides need separate future support.
