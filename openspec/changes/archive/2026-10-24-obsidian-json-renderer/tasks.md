## 1. Plugin

- [x] 1.1 Establish the standalone MIT-licensed package and Obsidian manifest.
- [x] 1.2 Register JSON rendering and block-local error handling.
- [x] 1.3 Display core SVG without modifying its output or injecting HTML.
- [x] 1.4 Add a starter insertion command with native notices.

## 2. Documentation and verification

- [x] 2.1 Document installation, format, themes, limitations, and manual smoke tests.
- [x] 2.2 Test parsing, real rendering in both orientations, errors, and plugin registration.
- [x] 2.3 Typecheck, build, and inspect the installable archive.
- [x] 2.4 Validate OpenSpec and run repository checks.

## Verification evidence

2026-10-24: 16 plugin tests passed, including the real renderer, exact SVG
preservation, and CommonJS host loading without network or other external runtime
dependencies. TypeScript checks and production packaging passed; ZIP contents
were inspected. Strict OpenSpec validation passed. Studio Go build, Go tests,
and all 90 security battle checks passed against an isolated temporary SQLite
database. The temporary server was stopped after testing.

Studio frontend build and lint passed with the same 310 existing warnings as the
original checkout and zero new warnings. Plugin source lint and ZIP integrity
checks passed. English/French changelog embedded copies match their sources.

In-app Obsidian desktop/mobile smoke testing remains a documented release check;
it has not been performed in this environment.
