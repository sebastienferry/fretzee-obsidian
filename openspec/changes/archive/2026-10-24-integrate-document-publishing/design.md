# Design

A DocumentPublishing controller attaches commands, context menus and one settings tab to the existing FretzeePlugin. Renderer processors register synchronously. Publishing configuration loads lazily after a user action, so offline rendering never needs credentials or network access.

The controller preserves unknown plugin data and writes only a nested publishing configuration. Credentials remain in Obsidian SecretStorage, bound to the normalized site origin. A confirmation lists the exact note/folder and non-Markdown attachments; the transport calls only the existing private draft import endpoint. Obsidian public path normalization is applied before vault lookups.

The existing plugin ID, runtime renderers, desktop compatibility declaration and license notices are preserved. Pending preparation and confirmation are invalidated on unload. A single pending confirmation prevents concurrent duplicate sends. Changing the destination or forgetting credentials before confirmation prevents transmission.

The source repository was initialized during integration. Publishing changes are isolated on their own feature worktree; the separate community release preparation stays untouched. Settings use the searchable public API supported by the existing Obsidian 1.14.5 minimum.
