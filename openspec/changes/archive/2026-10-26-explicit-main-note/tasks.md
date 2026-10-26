## 1. Implementation
- [x] Implement flat main-note metadata, directory resolution and designation offer in the plugin.
- [x] Export one directory container with portable Markdown and binary resources.
- [x] Add schema-three validation, server-derived roles and resource-aware inventory/reader.

## 2. Verification and delivery
- [x] Add plugin, API and UI regression tests and update documentation.
- [x] Pass plugin, Studio, OpenSpec and disposable security checks.
- [x] Verify browser/native behavior, install the updated existing plugin and restart dev.

## Verification evidence

The plugin passes 79 tests, typecheck and lint. The bundle builds successfully and Studio verifies exact preset download bytes and access controls. The corrected main.js was copied locally without changing the installed version, saved settings or enabled state. Reloading the running Obsidian process remains a user action.
