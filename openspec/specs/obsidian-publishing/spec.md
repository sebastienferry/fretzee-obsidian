# obsidian-publishing Specification

## Purpose
Defines optional private draft sending and secure site connection inside the existing Fretzee Obsidian plugin, while preserving offline musical rendering.

## Requirements

### Requirement: Single plugin installation
The existing Fretzee plugin SHALL provide offline musical rendering and optional document sending under the same plugin ID without requiring a second plugin.

#### Scenario: Render without publishing configuration
- **WHEN** the plugin loads without a site or credential
- **THEN** existing diagram, sheet, progression and tablature processors remain available
- **AND** no network request or publishing settings write occurs

### Requirement: Explicit private draft sending
The plugin SHALL send only a confirmed main-note directory and its resources, including supplementary Markdown and directly referenced binary attachments through the Studio document import API, preserving original source bytes and documented limits.

#### Scenario: Review outgoing scope
- **WHEN** the user invokes a send command or context-menu action
- **THEN** the complete outgoing file list appears before any network transmission
- **AND** hidden files and Markdown notes outside the selected directory are excluded

#### Scenario: Cancel or unload before confirmation
- **WHEN** the confirmation is cancelled or the plugin is unloaded before transmission
- **THEN** no upload occurs and the vault remains unchanged

### Requirement: Optional scoped configuration
Publishing settings SHALL preserve unrelated plugin data and store upload credentials only in SecretStorage with a destination-origin binding.

#### Scenario: Change destination before sending
- **WHEN** a prepared upload targets one site and the settings destination changes before confirmation
- **THEN** the upload is rejected without sending a credential

#### Scenario: Save publishing settings
- **WHEN** the owner saves a publishing site or token
- **THEN** other plugin settings remain intact
- **AND** the token is absent from plugin data.json

### Requirement: Stable portable note publications
The system SHALL accept one note and its referenced attachments using a stable owner-scoped frontmatter UUID. Portable exports SHALL use relative package paths without rewriting vault note bodies, and identical current-draft sends SHALL not create new revisions.

#### Scenario: Move or rename a note
- **WHEN** a note with the same fretzee.id is confirmed for sending after a move or rename
- **THEN** the same document receives the new private draft and retains its Collection placement and publication pointer

#### Scenario: Cancel or edit a reviewed send
- **WHEN** a send is canceled or selected note content changes before confirmation
- **THEN** the plugin sends nothing from that unconfirmed review and reports required re-preparation

#### Scenario: Package attachments
- **WHEN** a note references vault attachments of any file type through Markdown, wikilinks or tablature blocks
- **THEN** only those non-Markdown dependencies are included with relative exported references
- **AND** remote URLs, hidden files and linked-note traversal do not expand scope

#### Scenario: Duplicate identity
- **WHEN** a selected note shares its frontmatter UUID with another note in the active vault
- **THEN** sending fails with a readable duplicate-identity error instead of overwriting a document

#### Scenario: Legacy folder import
- **WHEN** an owner opens a prior schema-one import
- **THEN** its source bytes, URLs and existing access policy remain available

### Requirement: Explicit editorial main note
Each folder publication SHALL identify one editorial Markdown main note through flat Obsidian-compatible `fretzee-type: document` and stable `fretzee-id` properties, with all other included files treated as resources.

#### Scenario: Send from an attached resource
- **WHEN** the selected file is inside a directory with a marked main note
- **THEN** the plugin prepares that main note's directory container and treats the selected file as a resource

#### Scenario: Define a missing main note
- **WHEN** no enclosing main note is marked
- **THEN** the plugin offers to designate a Markdown note before reviewing the directory's outgoing files
- **AND** no source metadata or network data changes until the send is explicitly confirmed

#### Scenario: Markdown resources
- **WHEN** the container includes lyrics or another supplementary Markdown file
- **THEN** it remains an attached resource and does not create a separate publication
- **AND** the reader opens the editorial entry by default and distinguishes resource files

#### Scenario: Flat metadata and legacy identity
- **WHEN** an existing nested identity is sent through the new main-note workflow
- **THEN** its UUID remains stable and confirmed metadata uses flat text properties without dropping unrelated author metadata

#### Scenario: Ambiguous roots or changed review
- **WHEN** a container has multiple marked main notes or its outgoing scope changes before confirmation
- **THEN** sending stops with a readable error and does not silently publish a different main note

### Requirement: HX preset resources
The plugin SHALL accept HX and Helix presets with .hx and .hlx extensions, case-insensitively, as document resources without interpreting or rewriting their bytes.

#### Scenario: Directory or referenced preset
- **WHEN** an editorial directory contains a preset or a note references a preset directly
- **THEN** the reviewed export includes the original bytes under a portable resource path
- **AND** missing referenced presets still fail explicitly before transport

### Requirement: Unrestricted resource file types
Document exports SHALL accept resource files regardless of extension, including extensionless files. Renderer availability SHALL NOT restrict storage or download eligibility. Resource bytes SHALL remain unchanged.

#### Scenario: Arbitrary resource format
- **WHEN** an authorized outgoing directory or direct dependency contains an arbitrary file type or an extensionless resource
- **THEN** the reviewed package includes its original bytes with portable references under the existing path and size rules
