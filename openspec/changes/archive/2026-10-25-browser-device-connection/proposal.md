# Browser-based Obsidian device connection

## Why
The user wants to enter a site URL and connect the plugin by authorizing a device on the website instead of copying a token.

## What changes
Add an explicit browser authorization page, one-time PKCE-protected code exchange and a Connect this device action in the existing plugin. Preserve configurable HTTPS origins, loopback HTTP development, offline rendering, existing upload scopes and revocation through the site's device list.

## Impact
Optional connection only; no automatic file transmission, publication, deployments or vault content changes. Work is isolated from uncommitted portable-note development.
