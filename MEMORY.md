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
