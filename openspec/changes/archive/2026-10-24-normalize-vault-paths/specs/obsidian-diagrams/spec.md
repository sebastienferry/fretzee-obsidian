## ADDED Requirements

### Requirement: Canonical vault path resolution
The plugin SHALL normalize validated vault-relative Guitar Pro paths with
Obsidian's public normalizePath API before file lookup and event matching.

#### Scenario: Decomposed macOS accents
- **WHEN** a note uses an NFD path and the indexed file has the equivalent NFC spelling
- **THEN** the same vault file is loaded without changing the note or renaming the file

#### Scenario: Canonical source events
- **WHEN** a referenced path and a modify, delete, or rename event differ only in canonical Unicode form
- **THEN** the loaded excerpt refreshes or reports the missing source as appropriate

#### Scenario: Keep path boundaries
- **WHEN** a configuration specifies an absolute path, URL, or traversal segment
- **THEN** the plugin rejects it before canonicalization or file access
