## ADDED Requirements

### Requirement: Vault Guitar Pro excerpt selection
The plugin SHALL let users select a Guitar Pro file from the vault, one track,
and an inclusive range of measures and insert an editable `tablature` JSON block.

#### Scenario: Insert a selected excerpt
- **WHEN** the user chooses a Guitar Pro file, track, and valid measure range
- **THEN** the plugin inserts a block with its vault-relative path and one-based selection
- **AND** a native ephemeral notice confirms insertion
- **AND** the source Guitar Pro file remains unchanged

#### Scenario: Cancel the picker
- **WHEN** the user cancels selection
- **THEN** the note remains unchanged

### Requirement: Offline tablature excerpt rendering
The plugin SHALL render the selected track and measures in the note with bundled
AlphaTab and notation fonts without requiring network access or Studio credentials.

#### Scenario: Render selected measures
- **WHEN** a valid `tablature` block references a vault Guitar Pro file
- **THEN** only the selected track and inclusive measures appear in the excerpt
- **AND** Reading view and host-supported Live Preview use the same block processor

#### Scenario: Invalid source or selection
- **WHEN** the file is missing, corrupt, unsupported, oversized, or its track or measure selection is invalid
- **THEN** the affected block displays a readable text error without substituting other content
- **AND** other blocks remain usable

#### Scenario: Referenced file changes
- **WHEN** the referenced Guitar Pro file changes while the block is loaded
- **THEN** the excerpt is refreshed
- **AND** unloaded blocks do not render stale results or retain listeners
