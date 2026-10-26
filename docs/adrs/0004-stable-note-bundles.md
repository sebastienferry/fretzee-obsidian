# ADR: Stable portable note publication

Status: Accepted
Date: 2026-10-25

The owner requested one note and its dependencies with documents in My Collection. Use a local UUID in `fretzee.id`, scoped by authenticated server owner. Add it only after outgoing-scope confirmation. Source note bodies stay unchanged; export references are rebased to `assets/`. Do not traverse linked Markdown notes. Folder sends are manual batches, with operational acknowledgements in per-origin plugin state and credentials in SecretStorage. Studio owns Collection placement and deduplicates unchanged current drafts. Retain legacy folder imports. This costs duplicated shared attachments across note bundles but keeps each document portable and independently publishable.
