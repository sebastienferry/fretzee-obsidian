# Project memory

## Canonical Obsidian paths (2026-10-24)

macOS enumeration can return decomposed Unicode (NFD), while Obsidian indexes
vault names in NFC. A filesystem path that exists can therefore miss an exact
getAbstractFileByPath lookup. Validate vault-relative paths first and then call
the public normalizePath API for lookup, serialization and source-event matching.
Do not rename raw files, bypass the vault index, or scan all files as a workaround.
Regression coverage must model a canonical host index rather than echoing the
same raw string in both the reference and the stubbed file map.

## Desktop version and distribution checks (2026-10-24)

Obsidian's macOS bundle plist reports the launcher version, which may differ from
the running application. Use the app UI for the current runtime version. Native
Window types do not include the host's global DOM helpers; resolve them through
the owning document's window with the public API types. Test those helpers in the
host stub. Community installs only three standard assets, so retain dependency
notices within main.js as well as separate ZIP license files.

## One plugin for rendering and sending (2026-10-24)

The owner explicitly chose to integrate document sending into the existing Fretzee plugin, under plugin ID `fretzee`, instead of maintaining `fretzee-obsidian-publish` as a second installation. Publishing configuration is optional, loaded lazily and namespaced under `publishing`; preserve other saved settings. Upload credentials stay in SecretStorage with an origin binding. Register renderers synchronously and never require network access or publishing configuration for offline rendering.

The source repository was initialized during this work. Integration was moved to its own `feat/document-publishing` worktree, and the original checkout was restored to its initial commit baseline for the separate release preparation. The existing minimum Obsidian version is 1.14.5; use searchable setting definitions instead of deprecated display callbacks.

## Browser device connection (2026-10-25)

Browser connection uses a pending native state and S256 verifier, not a token in
the callback URL. Re-check destination and cancellation after each async boundary,
including immediately before SecretStorage writes; checking a revision before an
await can accept a stale completion. Consume client pending state before transport
and server codes atomically. Device credentials retain private-draft-only scope.
Connection work is isolated on feat/device-connection from uncommitted portable-note
work; merge those changes deliberately before release or vault replacement.
