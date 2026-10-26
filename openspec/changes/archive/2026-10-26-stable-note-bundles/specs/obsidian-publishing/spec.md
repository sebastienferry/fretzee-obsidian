## ADDED Requirements

### Requirement: Stable portable note publications
The system SHALL accept one note and its referenced attachments using a stable owner-scoped frontmatter UUID. Portable exports SHALL use relative package paths without rewriting vault note bodies, and identical current-draft sends SHALL not create new revisions.

#### Scenario: Move or rename a note
- **WHEN** a note with the same fretzee.id is confirmed for sending after a move or rename
- **THEN** the same document receives the new private draft and retains its Collection placement and publication pointer

#### Scenario: Cancel or edit a reviewed send
- **WHEN** a send is canceled or selected note content changes before confirmation
- **THEN** the plugin sends nothing from that unconfirmed review and reports required re-preparation

#### Scenario: Package attachments
- **WHEN** a note references supported vault attachments through Markdown, wikilinks or tablature blocks
- **THEN** only those non-Markdown dependencies are included with relative exported references
- **AND** remote URLs, hidden files and linked-note traversal do not expand scope

#### Scenario: Duplicate identity
- **WHEN** a selected note shares its frontmatter UUID with another note in the active vault
- **THEN** sending fails with a readable duplicate-identity error instead of overwriting a document

#### Scenario: Legacy folder import
- **WHEN** an owner opens a prior schema-one import
- **THEN** its source bytes, URLs and existing access policy remain available
