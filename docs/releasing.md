# Releasing Fretzee

1. Update package.json, manifest.json, package-lock.json, versions.json and README with the intended version. Set compatibility only to versions/platforms actually supported by the release scope.
2. Maintain CHANGELOG.md and add `docs/releases/<version>.md` with user-facing release notes.
3. Run `npm ci`, `npm run check`, `npm run spec:validate`, and `npm run package` from a clean checkout.
4. Verify Reading view, Live Preview, insertion/cancellation, source refresh, light/dark themes, popout windows and reload behavior in Obsidian. Do not publish private vault content or third-party music as fixtures or screenshots.
5. Inspect the staged source and confirm that GitHub CI passes on main.
6. Push a tag exactly equal to manifest.version, without a `v` prefix. The Release workflow repeats all checks, builds from the lockfile and uploads main.js, manifest.json, styles.css and the versioned ZIP.
7. Verify release assets, the default-branch manifest and their hashes. Do not move a published tag; use a new patch version for corrections.
8. Review the Community directory scan. Creating a GitHub release does not submit the plugin or guarantee acceptance.

The Community installer downloads only the three standard assets. Keep the notice banner in main.js. The ZIP also includes the separate original license texts. AlphaTab is unmodified; explicit notation modes operate on a private model copy through its public API. The official ESLint rules remain enabled; the brand dictionary preserves Fretzee and Guitar Pro capitalization.

Sources: [submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin), [submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins), [official lint rules](https://github.com/obsidianmd/eslint-plugin).
