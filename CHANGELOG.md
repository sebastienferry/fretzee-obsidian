# Changelog

All notable user-facing changes follow Keep a Changelog and Semantic Versioning.

## [Next]

## [0.4.1] - 2026-10-24

### Changed

- The initial public release targets Obsidian desktop 1.14.5 and newer.
- Dependency notices remain available when installing only the standard plugin files.

### Fixed

- Choosing score or tablature notation preserves the source track settings.

## [0.4.0] - 2026-10-24

### Added

- Adjust Guitar Pro excerpt zoom, hide extra headers with minimal mode, and add
  an explicit excerpt title.
- Write tablature options as simple key/value lines as well as JSON.
- Display chord progression grids with titles, key labels and aligned chord or
  roman-numeral measure rows in `chords` blocks.

## [0.3.1] - 2026-10-24

### Fixed

- Guitar Pro files in accented folders are found and refreshed correctly when
  macOS and Obsidian use different Unicode spellings of the same path.

## [0.3.0] - 2026-10-24

### Added

- Paste a complete Fretzee Studio sheet export into a note to render its diagrams
  in the configured columns, with titles, spacing, backgrounds and merged cells.
- Use either a `fretzee` or `fretzee_sheet` code block for sheet exports.

## [0.2.0] - 2026-10-24

### Added

- Choose a vault Guitar Pro file, track, and inclusive measure range and insert
  its excerpt into a note.
- Render tablature, score notation, or both offline with bundled musical fonts.
- Refresh loaded excerpts when source files change and show local errors for
  missing files or invalid selections.

## [0.1.0] - 2026-10-24

### Added

- Render exported Fretzee JSON diagrams offline in fenced code blocks.
- Insert a starter diagram through the command palette.
