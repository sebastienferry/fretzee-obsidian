## 1. Fix and verification

- [x] 1.1 Reproduce NFC/NFD path lookup and refresh failures.
- [x] 1.2 Normalize validated paths through the public Obsidian API.
- [x] 1.3 Add regression coverage, documentation and a project-memory entry.
- [x] 1.4 Run checks, package 0.3.1 and update the installed plugin with a backup.

## Verification evidence

- Reproduced both failures against an NFC-indexed vault using an NFD source reference before the fix.
- Typecheck, lint and all 38 tests pass; the 0.3.1 package builds successfully.
- Browser verification with the original local GPX renders measures 1–4 and the four-column chord sheet using a canonical vault index.
- Installed 0.3.1 in the authorized guitar vault and verified all nine release files by SHA-256.
- Backed up the previous installation at a local temporary backup outside the repository.
- Verified that the source GPX, test note and enabled-plugin configuration remain unchanged.
