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

## Portable note publishing (2026-10-25)

Schema two uses owner-scoped `note:<fretzee.id>` identity, one `note.md` and direct attachments under `assets/`. Only explicit send confirmation may add frontmatter identity; do not rewrite source bodies or copy tokens into notes. Folder sends are independent note batches. Revalidate reviewed bytes before writes and transport, preserve partial acknowledgements by origin, and keep Collection placement owned by Studio. Schema-one imports remain intact. Browser Markdown parsing initializes DOM helpers at import time; Node tests must preload a host document before importing the bundled plugin. Relative score references require the Markdown processor's sourcePath; direct legacy loads retain strict vault-root validation.

## Flat editorial main-note metadata (2026-10-26)

The owner explicitly chose one marked editorial Markdown per directory, with all other files (including lyrics Markdown) treated as resources. Use flat `fretzee-type: document` and `fretzee-id` text properties because Obsidian's visual Properties editor does not support nested properties. Read legacy nested IDs, preserving the UUID and unrelated metadata on confirmed migration. Resolve a selected resource to its enclosing main note. If none is defined, offer a main-note choice; neither choice nor review cancellation writes metadata. Schema three identifies a canonical entry with Markdown resources and server-derived roles. Never silently convert or delete existing uploads.

## Local delivery and preset resources (2026-10-26)

The owner explicitly rejected unsolicited version bumps and repeated activation toggles during local fixes. Preserve the installed version and enabled state; copying a corrected bundle does not reload an already running plugin. Never disable it as an intermediate step without completing recovery before switching tasks. HX/Helix presets (.hx, .hlx) are legitimate opaque document resources, not renderable-only content. Keep one shared attachment-format predicate across export paths.

## No resource file-type restrictions (2026-10-26)

The owner never requested a resource extension allowlist and explicitly rejected that restriction. Document resources accept arbitrary file types and extensionless files, retaining byte preservation, explicit outgoing review and existing path/size rules. Rendering capabilities must not determine whether a resource can be stored and downloaded.
