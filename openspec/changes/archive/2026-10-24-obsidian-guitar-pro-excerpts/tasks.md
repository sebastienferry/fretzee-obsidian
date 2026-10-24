## 1. Implementation

- [x] 1.1 Add vault Guitar Pro import, validation, and selected-track SVG rendering.
- [x] 1.2 Add lifecycle-safe `tablature` blocks and source-file refresh.
- [x] 1.3 Add a file, track, and measure picker with insertion notices.
- [x] 1.4 Bundle offline fonts and update the plugin version and notices.

## 2. Verification

- [x] 2.1 Test real Guitar Pro import and rendering, selection, invalid input, and lifecycle.
- [x] 2.2 Typecheck, lint, package, and inspect the archive.
- [x] 2.3 Update documentation and changelogs; run strict OpenSpec and repository checks.

## Verification evidence

2026-10-24: 27 automated tests passed, including real generated Guitar Pro
export/import, exact track and measure selection, notation modes, font embedding,
vault listeners, stale reads, picker insertion/cancellation, Fretzee regressions
and CommonJS host loading. TypeScript checks, lint and packaging passed. ZIP
integrity and bundled license files were verified. Four user-supplied vault files
in GP3, GP5, GPX and GP formats were imported successfully using read-only checks;
none were copied into the repository. A Chromium browser preview confirmed the
selected bass measure, tab numbers and musical symbols render with the embedded
font. Actual Obsidian and mobile smoke tests remain release checks.

The project and OpenSpec records were moved to the independent `fretzee-obsidian`
repository at the user's request; the Studio worktree has no remaining changes.
