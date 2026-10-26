## Decisions

Schema two uploads contain one Markdown entry and direct non-Markdown dependencies. Their source key is note:<frontmatter UUID>, scoped by authenticated owner. Schema one remains valid. The plugin resolves attachments through the vault index, including tablature code blocks, and rewrites recognized Markdown/wiki/definition/tablature references only in the exported copy. It does not traverse linked notes or fetch remote URLs. Relative Guitar Pro references are supported locally with source-note context while legacy vault-root references remain valid.

Confirmation precedes frontmatter writes and transport. Cancellation changes neither notes nor cloud state. Existing malformed metadata and duplicate UUIDs fail explicitly. Confirmed first send changes only fretzee.id; note body and unrelated metadata remain intact. The reviewed package is revalidated against edits before transport. Folder sends produce independent acknowledgements and retain successful results on partial failure. Per-origin plugin send state records remote ID, content digest and time without credentials. The server deduplicates identical current drafts by canonical content digest; the server remains authoritative.

Collection paths are separate owner-managed metadata and are never accepted from plugin uploads. A portable path column defaults to the root for old and new documents. Collection movement never changes vault files or source keys. Existing diagram/sheet state ownership is preserved; document operations use typed document adapters instead of diagram APIs. Published and granted readers retain snapshot ACL isolation. Legacy folder records remain available without automatic splitting.

## Verification

Exercise note rename, duplicate identities, cancellation, stale review, dependency rebasing, missing/unsafe assets, unchanged sends, failed transport, per-origin state, relative/legacy score rendering, Collection filters/movement/folder operations and cross-account isolation. Run both projects' strict OpenSpec, frontend/plugin checks, Go checks and enriched battle tests against disposable storage. Preserve cloud user content during verification.
