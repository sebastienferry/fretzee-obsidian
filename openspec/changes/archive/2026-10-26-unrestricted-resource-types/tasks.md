## Implementation and verification
- [x] Remove all resource extension allowlists.
- [x] Cover arbitrary and extensionless resources across export paths.
- [x] Update documentation and pass plugin and global specification checks.
- [x] Copy the corrected bundle without changing version or activation.

## Evidence

All plugin checks and build pass. Studio tests verify exact bytes, attachment downloads and access controls across arbitrary formats. The corrected main.js is installed locally with unchanged version, settings and enabled-state hashes. The running Obsidian process loads it on the user’s next reload.
