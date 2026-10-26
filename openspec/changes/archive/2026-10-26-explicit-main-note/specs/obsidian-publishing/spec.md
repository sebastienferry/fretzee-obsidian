## ADDED Requirements

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


## MODIFIED Requirements

### Requirement: Explicit private draft sending
The plugin SHALL send only a confirmed main-note directory and its resources, including supplementary Markdown and directly referenced binary attachments through the Studio document import API, preserving original source bytes and documented limits.

#### Scenario: Review outgoing scope
- **WHEN** the user invokes a send command or context-menu action
- **THEN** the complete outgoing file list appears before any network transmission
- **AND** hidden files and Markdown notes outside the selected directory are excluded

#### Scenario: Cancel or unload before confirmation
- **WHEN** the confirmation is cancelled or the plugin is unloaded before transmission
- **THEN** no upload occurs and the vault remains unchanged
