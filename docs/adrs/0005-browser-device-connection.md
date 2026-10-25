# ADR: Browser authorization for Obsidian devices

* **Status**: Accepted; implemented and verified locally
* **Date**: 2026-10-25
* **Deciders**: Project owner

## Context and Problem Statement

The owner wants a configurable site URL and a browser connection button instead of copying an upload token into Obsidian. Existing upload tokens already provide owner-scoped, revocable, private-draft-only access. Offline rendering must remain independent of account configuration.

## Decision Drivers

* Keep passwords and MFA in the external browser.
* Bind credentials to one explicit pending connection and destination origin.
* Avoid copying secrets or exposing them in browser URLs and synchronized plugin data.
* Reuse existing token scopes, expiry and revocation.

## Considered Options

* Manual token copying.
* Device-code polling.
* External browser authorization with a native callback and S256 PKCE.

## Decision Outcome

Use the external browser with an unpredictable client state and PKCE verifier held in memory for ten minutes. Show the same verification code in the plugin and on the site. The owner logs in, checks the device/site/account and confirms the request. A same-origin authenticated JSON endpoint creates a five-minute authorization code bound to the challenge. Only a hash is persisted. Return through the fixed `obsidian://fretzee-connect` action, targeting the requesting vault.

The plugin checks state and origin, then exchanges the code and verifier at the original origin. A serializable SQL transaction consumes the code and creates the existing 30-day upload-only token once. Store it only in SecretStorage, bound to the origin. URL change, disconnect, unload and stale async completion invalidate the local request. No connection action transmits a vault note or publishes a document.

This is a scoped Fretzee protocol following the native-browser/PKCE design principles, not a general-purpose OAuth provider. Manual server tokens remain compatible; the plugin's primary settings use browser connection. Revocation stays on the site and local disconnect does not imply remote revocation.

### Positive Consequences

* No manual credential transfer or plugin password field.
* The authorization code cannot be claimed without the verifier and cannot be reused.
* Existing account login/MFA and upload permission boundaries are preserved.

### Negative Consequences

* Both the site and plugin require this feature before the button works.
* Obsidian's native URI handoff needs desktop acceptance testing.
* In-memory pending state intentionally does not survive a plugin reload.

References: [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html), [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html).
