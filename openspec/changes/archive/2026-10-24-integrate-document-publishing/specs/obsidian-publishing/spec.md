## ADDED Requirements

### Requirement: Single plugin installation
The existing Fretzee plugin SHALL provide offline musical rendering and optional document sending under the same plugin ID without requiring a second plugin.

#### Scenario: Render without publishing configuration
- **WHEN** the plugin loads without a site or credential
- **THEN** existing diagram, sheet, progression and tablature processors remain available
- **AND** no network request or publishing settings write occurs

### Requirement: Explicit private draft sending
The plugin SHALL send only a confirmed note or folder and its direct non-Markdown attachments through the Studio document import API, preserving original source bytes and documented limits.

#### Scenario: Review outgoing scope
- **WHEN** the user invokes a send command or context-menu action
- **THEN** the complete outgoing file list appears before any network transmission
- **AND** hidden files and linked notes outside the selected scope are excluded

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
