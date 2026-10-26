# ADR: Flat main-note directory containers

Status: Accepted
Date: 2026-10-26

The owner requires one editorial main note per directory and explicitly identifies lyrics Markdown as a resource. Use flat Obsidian text properties `fretzee-type: document` and `fretzee-id`. Existing nested IDs remain readable and retain their UUID on confirmed migration. Sending any resource resolves to the nearest enclosing marked main note; absent a main note, offer a choice before outgoing review. Final confirmation alone changes source metadata. Export the whole visible supported directory as schema three, with `note.md` plus rebased resources, including Markdown. Reject ambiguous main notes rather than silently selecting a publication boundary. Old uploads remain unchanged until explicit owner management. This supersedes independent note batching for new sends.

Reference: https://obsidian.md/help/properties (nested properties require Source mode rather than the visual Properties editor).
