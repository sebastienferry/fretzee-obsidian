# ADR-0001: Offline Obsidian plugin

* **Status**: Accepted
* **Deciders**: Sébastien Ferry
* **Date**: 2026-10-24

## Context and Problem Statement

Obsidian users need to render the JSON configurations exported by Fretzee Studio
inside their notes, without depending on Studio authentication or connectivity.

## Decision Drivers

* Keep configurations portable and editable in Markdown.
* Preserve the shared core renderer's SVG output.
* Support local installation and offline rendering.
* Distribute the plugin under the user-selected MIT license.

## Considered Options

* A self-contained plugin bundling the published renderer.
* Remote rendering through Studio endpoints.
* An independent reimplementation of the SVG drawing logic.

## Decision Outcome

Use the standalone `fretzee-obsidian` TypeScript project, with its own MIT
license and package lock. Bundle `fretzee` into a CommonJS entry point and register
Obsidian's native Markdown code block processor. Serialize the core SVG unchanged
and display it through an image data URL to isolate it from the note DOM.

### Positive Consequences

* Works offline and requires no credentials or backend changes.
* Uses the same drawing behavior and JSON format as Studio.
* Retains original note source and avoids dynamic HTML injection.

### Negative Consequences

* Core upgrades require rebuilding the plugin.
* Diagram colors remain configuration-dependent across themes.
* Remote references remain outside the plugin; sheet composition is defined in ADR-0002.

## Pros and Cons of Options

### Self-contained plugin

* Good, because it preserves core behavior and works offline.
* Bad, because each release includes the renderer bundle.

### Remote rendering

* Good, because updates can be centralized.
* Bad, because rendering would depend on connectivity and authentication.

### Independent drawing logic

* Bad, because it duplicates the core and can diverge from Studio rendering.

## Guitar Pro excerpts and project extraction (2026-10-24)

The plugin is maintained in its own repository at the user's request. Bundle
AlphaTab 1.8.4 and unchanged Bravura WOFF2 data for offline SVG excerpts. The
plugin remains MIT licensed; AlphaTab retains MPL-2.0 and Bravura retains OFL-1.1.
Use the low-level importer and renderer without playback or workers. Store an
exact vault-relative path, one-based track, and inclusive measure range in a JSON
`tablature` block. Native modal controls support selection and insertion.

Markdown render children own vault listeners, reject invalid selections, and
invalidate pending reads on unload. Source files are never modified. Embedded
font styles apply only to AlphaTab SVG; Fretzee's drawing remains unchanged.

## Tablature presentation and literal progressions (2026-10-24)

Accept existing JSON and restricted flat key/value tablature blocks. Apply zoom
and minimal header visibility through AlphaTab settings before rendering, leaving
its score and drawing unchanged. Explicit block titles use safe note text nodes.
Render literal chord progression rows as semantic HTML tables with theme-aware
CSS rather than adding another notation engine. Key labels carry no transposition
behavior. Both input paths retain bounded validation and block-local errors.

## First public release (2026-10-24)

Target desktop Obsidian 1.14.5 and newer until device testing establishes mobile
support. Build from the lockfile in CI and include complete dependency license
texts within the standard main.js asset. Use the public staff-visibility API on
a private score copy for explicit notation profiles, avoiding deprecated display
settings and preserving the caller's imported model. JSON model copying adds
allocation for explicit profiles; excerpt bounds and the source-file limit remain
in place. Resolve DOM helpers in the owning window for popout compatibility.
