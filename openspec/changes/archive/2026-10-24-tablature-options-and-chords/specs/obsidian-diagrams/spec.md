## ADDED Requirements

### Requirement: Tablature presentation options
The plugin SHALL accept optional zoom, minimal and title fields in JSON or flat key/value tablature blocks while preserving source selection and offline rendering.

#### Scenario: Compact excerpt
- **WHEN** an excerpt specifies zoom 0.7 and minimal true
- **THEN** notation is laid out at 70 percent scale without score metadata, tuning, track labels or chord-diagram headers
- **AND** notes, measures, effects and an explicit block title remain visible

#### Scenario: Compatible defaults
- **WHEN** an existing JSON excerpt omits presentation options
- **THEN** it retains normal scale and full notation headers

#### Scenario: Invalid presentation options
- **WHEN** zoom is nonnumeric, nonfinite or outside 0.25–3, minimal is not boolean, or flat options repeat a key or use unsupported syntax
- **THEN** the block reports a readable local error without accessing the source

### Requirement: Chord progression blocks
The plugin SHALL render a chords fenced block with optional title and key metadata and aligned pipe-delimited measure rows offline.

#### Scenario: Roman numeral and chord rows
- **WHEN** a block contains title and key followed by rows | I / V | IV | and | G / D | C |
- **THEN** both two-measure rows appear in order under their title and key
- **AND** all symbols retain their supplied text without transposition or inference

#### Scenario: Invalid or untrusted progression
- **WHEN** input has inconsistent measure counts, unsupported metadata, excessive size, or HTML-like text
- **THEN** malformed input reports an isolated readable error
- **AND** supplied text never creates executable HTML
