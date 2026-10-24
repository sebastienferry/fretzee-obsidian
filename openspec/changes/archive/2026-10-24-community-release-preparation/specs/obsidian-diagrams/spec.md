## ADDED Requirements

### Requirement: Community release distribution
The plugin SHALL publish reproducible source and standard installation assets with the required dependency notices and accurate compatibility metadata for Community directory review.

#### Scenario: Standard Community installation
- **WHEN** an installer downloads only main.js, manifest.json and styles.css
- **THEN** the complete offline rendering code and dependency license notices remain available
- **AND** no private vault data is included

#### Scenario: Verified release
- **WHEN** a release is published
- **THEN** its exact version tag matches the manifest and its source passes typecheck, official Obsidian lint, tests and production build
- **AND** declared platform support matches the verified release scope
