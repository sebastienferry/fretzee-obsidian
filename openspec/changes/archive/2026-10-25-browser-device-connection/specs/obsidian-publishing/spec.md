## ADDED Requirements

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
