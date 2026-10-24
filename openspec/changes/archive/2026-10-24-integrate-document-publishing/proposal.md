# Integrate document publishing into the existing plugin

## Why

The owner already uses Fretzee for offline diagrams and wants document sending in that same installation. A second publishing plugin and repository duplicate installation, configuration and identity.

## What Changes

- Add optional explicit note/folder sends, outgoing-file confirmation and scoped upload credentials to the existing Fretzee plugin.
- Keep diagram, sheet, progression and Guitar Pro rendering independent of network access and publishing configuration.
- Preserve existing settings while storing publishing configuration in its own namespace and tokens only in SecretStorage.
- Keep the Studio import/publication contract unchanged and retain a single plugin ID, `fretzee`.

## Impact

Adds the obsidian-publishing capability. No automatic synchronization, publication, source modification or remote deletion is introduced. Native installation needs manual acceptance before release.
