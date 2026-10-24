## Implementation and verification

- [x] 1. Add and validate tablature presentation options and flat key/value input.
- [x] 2. Add safe chord progression parsing and rendering.
- [x] 3. Cover parsing, actual rendering, integration and existing behavior with tests.
- [x] 4. Update documentation, release metadata and package 0.4.0.
- [x] 5. Verify browser rendering and update the authorized vault with a backup.

## Verification evidence

- TypeScript typecheck and lint pass; all 46 tests pass, including existing diagrams, sheets, Unicode vault paths and lifecycle regressions.
- Actual Guitar Pro render tests verify zoom-dependent SVG dimensions, retained selected notes and hidden metadata without mutating the score.
- Browser smoke test uses the original local GPX and a canonical vault index: all SVG images decode, minimal zoom 0.7 produces 209px total SVG height versus 513px normally, and the literal progression renders two aligned two-measure rows.
- Visually checked clear and dark themes and a 220px chord-grid pane. Actual Obsidian activation remains dependent on reloading the installed plugin.
- Packaged version 0.4.0 and verified all nine installed release files by SHA-256; existing note, GPX and enabled-plugin configuration remain unchanged.
- Previous installation backup: a local temporary backup outside the repository.
