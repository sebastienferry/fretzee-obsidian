# ADR-0003: Optional publishing in the existing Fretzee plugin

* **Status**: Accepted
* **Deciders**: Project owner
* **Date**: 2026-10-24

## Context and Problem Statement

Fretzee already renders diagrams, sheets, chord grids and Guitar Pro excerpts inside Obsidian. The owner wants the same installation to send documents to the website. A separate Fretzee Publish prototype was created, then the owner requested integration into the existing plugin.

## Decision Drivers

* Keep a single plugin identity and installation.
* Preserve offline rendering without credentials or network access.
* Send only explicit, reviewable file selections as private drafts.
* Preserve source bytes, settings and existing release work.

## Considered Options

* Maintain separate rendering and publishing plugins.
* Extend the existing plugin with optional publishing.
* Automatically mirror the vault to the website.

## Decision Outcome

Extend the existing `fretzee` plugin with a DocumentPublishing controller. Rendering registers synchronously; publishing configuration loads only after a user action. Settings are namespaced and merged without overwriting unknown data. SecretStorage binds upload tokens to the destination origin.

The note command and folder context menu prepare source files, then require outgoing-file confirmation before using the existing Studio import API. Publication and reader selection remain website actions. The transport never edits the vault, publishes automatically or deletes remote content. The controller closes pending confirmations on unload and rechecks the destination and credential before sending.

Use Obsidian's public path normalization and searchable settings definitions, compatible with the existing minimum version. Version 0.5.0 identifies the new feature; no release tag or native installation is performed by this implementation.

### Positive Consequences

* One plugin handles offline musical rendering and optional document sending.
* Existing renderer behavior and bundled license notices stay intact.
* The server wire contract remains compatible with the tested prototype.

### Negative Consequences

* Publishing requires a compatible Studio deployment and an upload token.
* The initial website reader does not render the musical plugin blocks.
* Native desktop acceptance testing remains required before release; mobile support is unchanged.

## Follow-up decision

ADR-0004 introduces stable note identity and portable dependencies in the same plugin. It supersedes path-based publication identity for new sends while retaining offline rendering and the existing credential boundary.
