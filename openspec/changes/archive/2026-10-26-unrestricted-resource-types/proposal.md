## Why

An agent introduced an attachment extension allowlist without user instruction. The owner explicitly rejects file-type restrictions on document resources.

## What Changes

Remove the extension allowlist in both editorial and legacy export paths. Include arbitrary file types and extensionless resources without interpreting or converting their bytes. Keep existing review and path/size rules. Preserve the installed version and enabled state.

## Impact

Plugin exports, regression coverage and user-facing documentation. Studio already supports arbitrary resource bytes as protected downloads.
