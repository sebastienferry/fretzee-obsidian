## MODIFIED Requirements

### Requirement: Isolated errors and image rendering
The plugin SHALL display errors within the affected block and SHALL display core
SVG without changing the drawing or injecting untrusted markup into the note DOM.

#### Scenario: Invalid configuration
- **WHEN** a block is empty, contains malformed JSON, a non-object configuration, an unsupported sheet, or a renderer-invalid configuration
- **THEN** that block displays a readable text error
- **AND** other diagram blocks remain renderable

#### Scenario: Limit configuration size
- **WHEN** a block exceeds 262,144 UTF-16 code units
- **THEN** the plugin displays a size-limit error before parsing or rendering

#### Scenario: Untrusted labels
- **WHEN** configuration text contains HTML or script-like labels
- **THEN** the plugin displays the generated SVG through an isolated image context
- **AND** labels and error text do not create executable elements in the note DOM

## ADDED Requirements

### Requirement: Offline composite sheet rendering
The plugin SHALL accept a complete `fretzee_sheet` JSON export in a `fretzee` or
`fretzee_sheet` block and display its diagram items in the configured grid offline.

#### Scenario: Preserve four columns
- **WHEN** an exported sheet has four diagram items and layout.columns is 4
- **THEN** all four diagrams appear in one row in their original order
- **AND** the declared horizontal gap, padding, and sheet title are retained
- **AND** a narrow note scales the diagrams without reducing the column count

#### Scenario: Respect sheet display options
- **WHEN** a supported sheet declares gaps, padding, background, title alignment, visibility, spans, orientation, or uniform-spacing options
- **THEN** these options are reflected in the sheet layout or passed as renderer input
- **AND** each core SVG drawing remains unchanged after rendering

#### Scenario: Ignore cached previews
- **WHEN** sheet items contain thumbnails, identifiers, or duplicate payloads
- **THEN** the plugin renders the actual configuration rather than injecting cached SVG or resolving remote IDs

#### Scenario: Invalid or unsupported sheet
- **WHEN** a sheet is empty, exceeds 64 diagrams or 8 columns, contains invalid layout values, nested sheets, or a non-null palette override
- **THEN** the block displays a readable error without substituting unrelated content
