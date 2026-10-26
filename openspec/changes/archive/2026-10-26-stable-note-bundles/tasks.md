## 1. Plugin
- [x] Implement stable identity and portable per-note dependency bundles.
- [x] Confirm before metadata changes, validate stale reviews and handle duplicate IDs.
- [x] Batch folders, record per-origin acknowledgements and preserve credentials.
- [x] Support relative Guitar Pro references while retaining legacy rendering.

## 2. Studio
- [x] Add note schema validation, current-draft deduplication and independent Collection placement.
- [x] Integrate document cards, filters, navigation and folder operations in My Collection.
- [x] Preserve legacy imports, publication ACLs and reader behavior.

## 3. Delivery
- [x] Update architecture, specifications, guides, changelogs and memory in both repositories.
- [x] Add regression tests and pass both projects' checks and disposable battle suite.
- [x] Verify browser behavior and package the updated existing plugin.
- [x] Install the local plugin build and restart the dev server for testing.

## Verification evidence

- Plugin 0.6.0: 73 tests, zero lint warnings, typecheck, package and strict global OpenSpec pass.
- Studio: 69 frontend tests and production build pass; EN/FR key parity passes; lint remains at the existing 202 warnings.
- Go build, full test suite and vet pass. The disposable SQLite battle suite passes all 73 checks.
- Browser acceptance verifies mixed Collection content, independent movement, folder counts, document filter, return navigation, dark/light themes, diagram and relative Guitar Pro rendering. Screenshots are saved locally.
- Existing native Obsidian plugin backed up, updated to 0.6.0 and re-enabled. Settings were preserved and reloaded successfully. No user note was sent or edited.
- Dev server restarted with the existing explicit dev profile; SQL health and LAN frontend access pass. Existing legacy private import retains four notes, one attachment and its root Collection placement.
