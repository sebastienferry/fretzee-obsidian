## Context

The existing plugin renders Fretzee JSON offline. Studio uses AlphaTab to import
Guitar Pro and select tracks and bars. Obsidian provides vault binary reads and
Markdown render children for lifecycle management.

## Goals / Non-Goals

Goals: choose a local Guitar Pro file, a track, and an inclusive bar range; render
the selected excerpt inside the note; retain editable source; work offline.
Non-goals: playback, remote Studio IDs, filesystem access outside the vault,
automatic conversion into fretboard diagrams, and writing to Guitar Pro files.

## Decisions

- Bundle the same AlphaTab version as Studio and use its score importer and SVG renderer.
- Store a vault-root-relative file path, one-based track number, and inclusive bars
  in JSON `tablature` blocks. Validate strictly instead of silently clamping.
- Provide a native modal with file, track, and range selectors and insertion notices.
- Resolve through Obsidian's vault API and fail closed for missing, invalid, or oversized files.
- Keep rendering scoped to the Markdown child lifetime; cancel stale work and
  refresh on referenced-file changes. Bundled fonts keep notation available offline.

## Risks / Trade-offs

Guitar Pro imports consume memory, so limit file size and range length. Paths can
become stale after moves; report missing sources rather than substituting other
files. Desktop/mobile Obsidian smoke testing remains a release check.

## Verification Plan

Test a real generated Guitar Pro file with multiple tracks and bars, exact excerpt
selection, errors, cancellation, file refresh, modal insertion, packaged runtime,
and preservation of the existing diagram functionality. Run typecheck, packaging,
lint, strict OpenSpec validation, and repository validation.
