## Why

Obsidian practice notes need excerpts from Guitar Pro files already stored in the
vault, with explicit track and measure selection.

## What Changes

- Add a command to select a vault Guitar Pro file, track, and inclusive measure range.
- Insert a portable JSON `tablature` block and render it offline with bundled AlphaTab.
- Keep errors local, read only through the vault API, and bundle notation fonts.
- Release an updated installable package from the standalone `fretzee-obsidian` repository under the existing MIT license.

## Capabilities

### Modified Capabilities
- `obsidian-diagrams`: Extend the plugin with Guitar Pro excerpt blocks and a picker.

## Impact

Changes are isolated to the standalone Obsidian plugin and its documentation.
Playback, diagram extraction from notes, external file access, and Studio file IDs
are outside this request. Guitar Pro files remain unchanged.
