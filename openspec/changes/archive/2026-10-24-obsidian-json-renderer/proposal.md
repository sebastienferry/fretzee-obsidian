## Why

Musicians keep practice notes in Obsidian and need to reuse Fretzee diagram
configurations without exporting a static image again after each edit.

## What Changes

- Add an independent MIT-licensed Obsidian plugin under `integrations/obsidian`.
- Render single-diagram JSON inside `fretzee` fenced blocks using the bundled
  Fretzee renderer, entirely offline.
- Offer a command to insert a starter diagram and readable block-local errors.
- Provide reproducible builds, automated tests, and a vault-installable archive.

## Capabilities

### New Capabilities
- `obsidian-diagrams`: Offline rendering of Fretzee configuration blocks in Obsidian notes.

## Impact

The plugin is independently built and licensed. Studio backend, authentication,
database, UI, and the core renderer remain unchanged. The initial version covers
single diagrams; composite sheets, file references, and server-backed IDs are
outside its scope.
