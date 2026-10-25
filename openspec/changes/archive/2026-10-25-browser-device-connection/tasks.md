## Implementation

- [x] 1. Add the browser authorization and atomic PKCE exchange contract.
- [x] 2. Add site consent UI and plugin connection controls with configurable URL.
- [x] 3. Test consent, expiry, replay, PKCE, origin binding, cancellation and existing offline behavior.
- [x] 4. Update guides, changelogs and architecture documentation; complete build, lint, tests and spec validation.

## Verification status

Client and web implementation is isolated from concurrent stable-note-bundle development. Plugin typecheck/lint, all 67 tests and the distributable build pass. All 51 web tests, the production build and English/French translation parity pass; lint has no new warnings against the committed baseline. Server build, go vet and go test ./... pass. The security battle suite passes all 73 checks against an isolated local SQLite server, including browser authorization, PKCE proof, single-use exchange and revocation. Strict OpenSpec validation passes. The native Obsidian URI handoff still needs desktop acceptance after integration. No deployment, vault update or release tag has been performed.
