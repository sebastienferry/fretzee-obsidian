## ADDED Requirements

### Requirement: HX preset resources
The plugin SHALL accept HX and Helix presets with .hx and .hlx extensions, case-insensitively, as document resources without interpreting or rewriting their bytes.

#### Scenario: Directory or referenced preset
- **WHEN** an editorial directory contains a preset or a note references a preset directly
- **THEN** the reviewed export includes the original bytes under a portable resource path
- **AND** missing referenced presets still fail explicitly before transport
