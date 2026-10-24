## Release preparation

- [x] 1. Add and pass official Obsidian lint checks and resolve review findings.
- [x] 2. Preserve license notices in standard assets and verify packaging.
- [x] 3. Document compatibility and prepare CI, release automation and submission materials.
- [x] 4. Verify tests, build, specs and host rendering; inspect publication contents.
- [x] 5. Publish the source repository and release on the user's GitHub account and verify assets.

## Verification evidence

- Clean lockfile install, official recommended Obsidian ESLint with zero warnings, TypeScript, 47 tests, strict OpenSpec validation and production packaging pass.
- GitHub CI passed on the initial public main commit.
- Verified in native Obsidian 1.14.5: four-column sheet, Guitar Pro measures 1–4, explicit Intro title, minimal headers at zoom 0.7, aligned progression cells, Reading view and Live Preview, and picker opening/cancellation.
- Public source inspection excludes private vault content, source music and credentials. Concurrent document-publishing development remains outside this isolated release.
- Source repository: https://github.com/sebastienferry/fretzee-obsidian (public, GitHub recognizes MIT).
- Official directory login is required before the owner can complete policy acceptance and submission; no approval is claimed.
- Published release: https://github.com/sebastienferry/fretzee-obsidian/releases/tag/0.4.1. Both CI and Release workflows completed successfully.
- Downloaded all public standard assets and verified SHA-256 equality with the clean local build; the ZIP passes integrity checks and contains those same assets and license files.
