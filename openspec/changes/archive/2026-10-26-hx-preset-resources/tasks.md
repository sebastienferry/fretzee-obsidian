## Implementation and verification
- [x] Share the attachment-format predicate and accept .hx/.hlx resources.
- [x] Verify byte preservation, rebasing and missing-resource errors.
- [x] Update user documentation and pass plugin checks and strict OpenSpec.
- [x] Copy the corrected local bundle without version or activation changes.

## Verification evidence

The plugin passes 79 tests, typecheck and lint. The bundle builds successfully and Studio verifies exact preset download bytes and access controls. The corrected main.js was copied locally without changing the installed version, saved settings or enabled state. Reloading the running Obsidian process remains a user action.
