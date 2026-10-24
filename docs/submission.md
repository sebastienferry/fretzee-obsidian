# Community directory submission

## Entry details

- Name: Fretzee
- Identifier: fretzee
- Repository: https://github.com/sebastienferry/fretzee-obsidian
- Release: https://github.com/sebastienferry/fretzee-obsidian/releases/tag/0.4.1
- License: MIT for plugin source; see THIRD_PARTY_NOTICES.md for bundled dependencies.
- Payment type: Free
- Platforms: Desktop, Obsidian 1.14.5 and newer
- Suggested categories, if offered: Editing, Media

## Short description

Render Fretzee diagrams, sheets, chord progressions, and vault Guitar Pro excerpts in Obsidian notes.

## Listing description

Create guitar and bass study notes with offline Fretzee diagrams and chord sheets. Paste an exported Studio configuration or a complete sheet into a fenced block, preserving the configured layout and diagram colors.

Choose a Guitar Pro file from the current vault, select a track and an inclusive measure range, and display tablature, score notation or both. Add an excerpt title, adjust zoom, or use minimal headers. Literal chord names and roman-numeral progressions can be arranged in measure-aligned grids with a title and key label.

No Studio account, server, API key or network connection is required. The plugin reads referenced music files through the vault API and does not alter them. There is no telemetry, advertising, playback or automatic plugin updating. The initial public release targets desktop; mobile support has not been verified.

## Preparation verification

The clean lockfile build passes TypeScript, the official Obsidian ESLint rules
with zero warnings, 47 automated tests and strict OpenSpec validation. GitHub CI
also passes. Native Obsidian 1.14.5 verification covers the four-column sheet,
minimal zoomed Guitar Pro excerpt, explicit title, aligned chord progression,
Reading view, Live Preview and picker opening/cancellation. Mobile is outside
the initial release scope. These checks do not replace the directory's review.

## Submission procedure

1. Sign in at https://community.obsidian.md with the owner's Obsidian account.
2. Connect the GitHub account that owns the repository.
3. Select Plugins, then New plugin. Enter the repository URL above and choose the owner.
4. Review the Developer policies and the ongoing-maintenance commitment. The account owner must explicitly accept these before submission.
5. Submit and examine the automated review results. Fix errors in source and publish a new version if requested. Use Review branch to preview source checks when offered.
6. Complete the listing with the text above and publish only after errors are resolved.

A GitHub release and local official lint success do not constitute Community approval. Keep this document accurate as the directory review progresses. Do not include private vault notes, song files or copyrighted score screenshots with the submission. Optional screenshots should use original fixtures such as the examples in README.

Official references: [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin), [Set up and claim](https://docs.obsidian.md/community-directory/set-up-and-claim), [Developer policies](https://docs.obsidian.md/community-directory/developer-policies).
