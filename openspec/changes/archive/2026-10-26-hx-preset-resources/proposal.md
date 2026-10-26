## Why

The directory exporter rejects HX/Helix presets next to editorial notes even though these are legitimate user resources.

## What Changes

Allow .hx and .hlx attachments with case-insensitive extensions in both directory and legacy direct-dependency export. Share the extension contract to avoid drift. Preserve original bytes, review, path checks and size limits. Do not bump versions or toggle plugin activation.

## Impact

Existing plugin export validation, resource regression coverage and user documentation. Studio already accepts these resources as protected downloads.
