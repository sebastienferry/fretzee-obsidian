## Decisions

Flat text properties are canonical: `fretzee-type: document`, `fretzee-id: <UUID>`. Preserve IDs when reading nested `fretzee.id`; migrate only that known identity property to flat metadata on confirmed sending, preserving unrelated metadata. Do not create nested mappings. One directory has one main note; selecting another file resolves its nearest enclosing marked main note. A directory without a main note offers a Markdown choice, defaulting to the current note. Both choice cancellation and outgoing review cancellation leave vault files unchanged. Final send confirms metadata changes.

The whole visible directory becomes one schema-three container with canonical `note.md` and resources under `assets/`, including other Markdown. Preserve source bytes and rebase links only in exported copies; Markdown resources can reference each other and included attachments. Do not traverse Markdown outside the selected container. Reject multiple marked main notes within one container so boundaries stay explicit. Existing size, safety, confirmation, stale-review, token and trash policies remain. The server derives file roles from entry and schema, counts exactly one main note, and preserves Collection placement. Old schemas remain unchanged. Existing incorrect uploads are retained until their owner removes them.

## Verification

Cover resource-to-main selection, missing-main offer/cancellation, duplicate roots, flat property migration with stable identity, Markdown resources/relative links, scope changes, role counts, reader defaults, ACLs and trash. Check native Obsidian installation without sending user data and exercise Studio using disposable fixtures.
