## Why

A macOS-derived path uses decomposed accents while Obsidian indexes paths in
canonical composed form. An existing Guitar Pro file therefore appears missing
when a note contains the filesystem spelling of an accented folder.

## What Changes

- Normalize validated vault paths through Obsidian's normalizePath API before
  lookup and serialization, and normalize paths when matching source events.
- Preserve strict vault-relative validation and direct index lookup.
- Release a patch and update the installed plugin without rewriting source files.

## Capabilities

### Modified Capabilities
- `obsidian-diagrams`: Recognize canonically equivalent accented vault paths.

## Impact

Only path handling, regression coverage and documentation change. No directory
scans, approximate filename matches, adapter bypasses or raw file renames occur.
