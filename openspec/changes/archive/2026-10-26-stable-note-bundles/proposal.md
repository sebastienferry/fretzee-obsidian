## Why

Owners publish notes authored in Obsidian and need to browse them beside diagrams and sheets. Path-based source identity changes on rename, full vault paths are not portable, and folder snapshots combine unrelated publication units.

## What Changes

- Use one note and its explicitly referenced non-Markdown dependencies per publication.
- Assign a stable UUID in fretzee.id frontmatter on confirmed sending, preserving other note metadata and body.
- Export portable note.md plus assets with rewritten references in the sent copy only.
- Treat a selected folder as a bounded manual batch of independent notes.
- Keep per-origin send acknowledgements outside frontmatter and credentials in SecretStorage.
- Add owner-managed Collection placement, unchanged by later sends, with documents in Collection navigation, filters and folder operations.
- Retain legacy schema-one folder imports and their existing URLs.

## Capabilities
### Modified Capabilities
- `document-publication`: Stable note identity, portable dependencies and idempotent sends.
- `collections`: Mixed document, diagram and sheet browsing and independent placement.

## Impact

Existing Obsidian plugin, additive SQL migration, document APIs, Collection UI, guides and tests. Editing remains in Obsidian; no automatic synchronization, publication, source deletion or legacy conversion occurs.
