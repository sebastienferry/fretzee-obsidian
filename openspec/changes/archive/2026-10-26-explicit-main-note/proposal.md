# Explicit main note and folder resources

## Why

The owner observed lyrics Markdown becoming its own document. Each directory must instead have one explicit editorial main note and associated resources. Obsidian Properties requires flat scalar metadata for reliable visual editing.

## What Changes

- Use flat `fretzee-type: document` and `fretzee-id` text properties. Read existing nested IDs for identity compatibility.
- Sending a resource selects the directory's existing main note. If none exists, offer to designate a Markdown note before outgoing-scope review.
- Send one whole-directory container; all other visible supported files, including Markdown, are resources.
- Introduce schema three with an explicit entry and server-derived document/resource roles; retain legacy schemas.

## Impact

Existing plugin, upload contract, reader role labels, inventory and tests. No automatic conversion or deletion of existing publications.
