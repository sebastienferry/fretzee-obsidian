## Context

The test note contains NFD `Répertoire` from macOS filesystem enumeration. The
installed Obsidian source normalizes indexed names to NFC and uses exact keys
for getAbstractFileByPath. The plugin omitted normalization before lookup.

## Decisions

Validate paths first, then use the public normalizePath API for canonicalization.
Apply the same transformation to parsing, direct loads, serialized blocks and
modify/delete/rename event matching. Keep the user's existing note unchanged.

## Verification Plan

First reproduce the failure with an NFC-indexed mock vault and an NFD reference.
Then test successful real Guitar Pro import and event-driven refresh with both
spellings, existing invalid-path rejection, all regressions and the installed
bundle against the real vault file. Package and install patch version 0.3.1.
