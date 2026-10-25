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

### Requirement: Browser-authorized Obsidian devices
The system SHALL let an owner connect the existing plugin to a configurable site through external-browser approval without manually copying a credential.

#### Scenario: Approve a device
- **WHEN** the owner saves a valid site URL, starts connection and explicitly approves the device after site login
- **THEN** a one-time PKCE-bound code returns to the initiating vault
- **AND** only that pending connection can exchange it for an upload-only credential stored in SecretStorage
- **AND** the device is revocable through the owner's existing site device list

#### Scenario: Refuse or abandon connection
- **WHEN** approval is cancelled, the site changes, the plugin unloads, or the connection expires
- **THEN** no new local credential is stored and no vault file is sent

#### Scenario: Reject stolen or replayed codes
- **WHEN** a caller supplies a wrong verifier, expired code, reused code, mismatched state, or an unauthorized browser approval
- **THEN** no credential is issued to that caller
- **AND** upload tokens never appear in browser callbacks or synced settings
