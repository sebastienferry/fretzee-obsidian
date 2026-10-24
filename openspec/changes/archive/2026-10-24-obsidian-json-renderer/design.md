## Context

Studio exports diagram configurations accepted by the published `fretzee` npm
package. Obsidian exposes a Markdown code block processor API and loads CommonJS
plugin bundles. The integration belongs in its own directory with its own MIT
license, package lock, tests, and build output.

## Goals / Non-Goals

Goals: render JSON without network access; preserve core SVG output and note
source; isolate invalid blocks; generate an installable plugin folder and ZIP.

Non-goals: Studio integration APIs, composite rendering, visual editing, JSON file
watching, SVG file export, and publication to Obsidian's community directory.

## Decisions

- Bundle `fretzee` 0.3.6 using esbuild, leaving only `obsidian` external.
- Register the `fretzee` code block language through the host API. Reading view
  and Live Preview use Obsidian's native rendering lifecycle.
- Accept a raw object or a diagram record's `config` object. Leave semantic
  diagram validation to the renderer. Bound JSON text length to 262,144 code units.
- Display serialized SVG through an image data URL. This preserves the core's
  drawing while isolating SVG from the note DOM. No dynamic HTML injection,
  script execution, remote SVG resources, timers, or object URL cleanup is needed.
- Serialize through the SVG element's native `outerHTML`: `XMLSerializer` adds a
  duplicate `xmlns` declaration to the core 0.3.6 SVG in jsdom, producing invalid
  standalone XML. Native DOM serialization preserves valid core output unchanged.
- Use Obsidian theme tokens for the container and retain configured SVG colors.
- Use a native Notice for the state-mutating example insertion command.

## Risks / Trade-offs

- Diagrams authored for one background can have poor contrast in another theme.
  Users retain control of colors; the plugin never recolors core output.
- Tests exercise the real renderer in jsdom and the host integration through an
  API stub. Reading view, Live Preview, and mobile require in-app smoke testing.
- Composite configurations must be rejected explicitly rather than interpreted
  as default boards. The plugin does not resolve Studio diagram IDs.

## Verification Plan

Run strict TypeScript checks, real SVG rendering and host integration tests,
production bundling, archive inspection, and strict OpenSpec validation. Complete
repository Go validation separately and report any environment failures honestly.
