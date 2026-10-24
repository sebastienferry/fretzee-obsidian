# Fretzee for Obsidian

Render Fretzee JSON diagrams, composite sheets, chord progressions and selected Guitar Pro excerpts directly in your
Obsidian notes. Rendering works offline: the diagram engine, AlphaTab and its
notation font are bundled. Rendering needs no Studio account, server, API key, or CDN.

The same plugin optionally sends selected notes or folders to Fretzee as private drafts. Publishing requires a compatible Studio server and an upload token; it is independent of offline rendering. No second plugin is required.

## Install or update

1. Download `fretzee-0.4.1.zip` from the [GitHub release](https://github.com/sebastienferry/fretzee-obsidian/releases/latest) and extract it into your vault's `.obsidian/plugins/` folder.
   You must have `.obsidian/plugins/fretzee/main.js`, `manifest.json` and
   `styles.css`. Keep the accompanying license files.
2. Restart Obsidian, open **Settings → Community plugins**, allow community
   plugins if needed, and enable **Fretzee**.
3. To update, disable Fretzee, copy the new package files into the existing plugin
   folder while preserving `data.json`, restart Obsidian, and enable it again. Your notes and source files are
   unchanged by this process.

The first public release targets **Obsidian desktop 1.14.5 or newer**. Mobile
support is not advertised until it has been verified on devices. The plugin is
not yet listed in the Community directory; a GitHub release does not imply
Obsidian approval. See [submission preparation](docs/submission.md).

## Send documents to Fretzee

Publishing support is introduced by the **0.5.0 feature branch** and is not included in the earlier 0.4.1 release. Build its package with `npm ci && npm run check && npm run package`, then copy its files into your existing `.obsidian/plugins/fretzee/` folder using `dist/fretzee-0.5.0.zip`. Preserve any existing `data.json` so connection settings and source identity survive updates. Keep the manifest, main bundle, stylesheet and license notices together. Do not install the superseded standalone Fretzee Publish prototype.

1. Use a Studio server implementing the document-publication API. Open **Documents → Connect Obsidian**, create a named upload token and copy it once.
2. In **Settings → Fretzee**, configure the site origin and click **Save site**. HTTPS is required except for loopback HTTP development sites.
3. Enter the token and click **Save token**. Credentials stay in Obsidian SecretStorage, bound to that site; plugin data.json contains only non-secret publishing settings. Tokens expire after 30 days and are revoked on the site.
4. Run **Fretzee: Send current note as a private draft**, or right-click a note/folder and choose **Send to Fretzee as a private draft**.
5. Inspect the complete outgoing-file list before confirming. Hidden files are excluded. Linked Markdown notes outside the selected scope are not followed; directly referenced attachments can come from elsewhere in the vault.
6. Review the private draft on the website, then publish for everyone or selected existing accounts. Subsequent sends leave the published version unchanged until you publish explicitly again.

This is explicit one-way sending. There is no automatic background synchronization, remote publication, vault editing or remote deletion. A renamed source creates a separate publication identity. Uploads preserve original bytes and are limited to 200 files, 10 MiB per file and 20 MiB total. Preview hides frontmatter, but source downloads preserve it.

Studio's initial reader supports ordinary Markdown, wikilinks and raster image embeds. The original Fretzee blocks, Guitar Pro rendering, chord grids and sheets continue to render inside Obsidian; the document website does not yet render those plugin blocks or provide media players. Native Obsidian acceptance testing remains necessary before releasing this integration.

## Insert a Guitar Pro excerpt

1. Put a Guitar Pro file inside your vault, including an existing `raw/` folder.
   Make sure cloud-backed files are downloaded and available locally.
2. Open the destination note and place the cursor where the excerpt belongs.
3. Run **Fretzee: Insert Guitar Pro excerpt** from Obsidian's command palette.
4. Choose the file, track, first measure and last measure. Both measure numbers
   are inclusive and start at 1. Choose tablature, score, or both.
5. Click **Insert excerpt**, then use Reading view or leave the code block in
   Live Preview to see the rendering.

The inserted block remains editable JSON:

````markdown
```tablature
{
  "file": "raw/Tablatures/Exercise.gp",
  "track": 2,
  "bars": "5-12",
  "profile": "tab"
}
```
````

`file` is the exact path from the vault root, including spaces and accents. It is
not an absolute computer path, a URL, a wikilink, or a Studio file ID. Canonically
equivalent composed/decomposed accents in paths are normalized using Obsidian's
public API; source files and existing notes are not renamed or rewritten. Track
numbers start at 1 in file order. `bars` accepts `5-12` or a single measure such as `5`. `profile` is `tab`, `score`, or `default` (both). If omitted, track 1
and tablature notation are used. Plain JSON code blocks are never processed.

Supported file extensions: `.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`. Files are limited
to 20 MiB and excerpts to 128 measures. A track without string tuning can be
rendered as score notation. Invalid files and selections produce a local error;
the plugin never substitutes a different track, range, or demo.

When a referenced file changes, its loaded excerpt refreshes. If the file is
renamed, moved, or deleted, update the block's path; the plugin reports the missing
source and does not rewrite notes automatically. Excerpts store references, so
keep their Guitar Pro sources in the vault. Source Guitar Pro files are read only.

### Tablature size and compact mode

Both JSON and simple flat `key: value` input accept these optional fields:

| Option | Default | Behavior |
| --- | --- | --- |
| `zoom` | `1` | Notation scale from `0.25` to `3`; `0.7` is 70 percent. The renderer reflows measures to the note width. |
| `minimal` | `false` | Hide score metadata, tuning, track labels and chord-diagram headers. Notes, rhythm, effects and measure numbers remain. |
| `title` | Omitted | Display a text heading above the excerpt, including in minimal mode; maximum 200 characters. |

For example:

````markdown
```tablature
file: raw/Tablatures/Exercise.gpx
track: 1
bars: 1-4
profile: tab
title: Intro
minimal: true
zoom: 0.7
```
````

Use the full path relative to the vault root. In JSON, add `"zoom": 0.7`,
`"minimal": true` and `"title": "Intro"` to the same object as `file` and `bars`.
The picker keeps inserting JSON; presentation fields can be edited in the block.
The flat syntax supports plain text, JSON double-quoted strings and single-quoted
strings (double an internal apostrophe). It is not a full YAML parser: nesting,
aliases, comments and duplicate or unknown keys are unsupported. Numeric and
boolean options must use their actual types, rather than quoted strings.

## Insert a chord progression

Use a `chords` block with optional `title` and `key`, followed by pipe-delimited
measure rows:

````markdown
```chords
title: Chord progression
key: G
| I / V | IV |
| G / D | C  |
```
````

Each source row becomes one table row and each pipe-delimited measure becomes
one cell. Equal measure counts keep the degree row aligned with the chord row.
Chord names, roman numerals, accidentals and `/` markers remain literal text:
`key` labels the progression and does not transpose it or generate chord shapes.
Metadata must precede the measure rows. Blank lines are ignored. Every row needs
opening and closing `|` delimiters and nonempty measures.

Chord grids use the vault theme and scroll horizontally when necessary. Limits:
16,384 code units, 32 rows, 32 measures per row, 256 cells, 200 characters per
measure/title and 40 characters for the key. Errors stay inside the affected block.

## Insert a Fretzee diagram

Copy a single diagram's JSON configuration from Fretzee Studio into a fenced
`fretzee` block, or run **Fretzee: Insert example diagram**:

````markdown
```fretzee
{
  "title": "C major",
  "stringCount": 6,
  "fretCount": 4,
  "orientation": "vertical",
  "fingerings": [
    { "string": 6, "fret": -1 },
    { "string": 5, "fret": 3, "text": "3" },
    { "string": 4, "fret": 2, "text": "2" },
    { "string": 3, "fret": 0 },
    { "string": 2, "fret": 1, "text": "1" },
    { "string": 1, "fret": 0 }
  ]
}
```
````

Raw configurations and diagram records with a `config` object are accepted.
With a record, put the drawing's title in `config.title`. All renderer options
pass through unchanged, including tuning, colors, orientation and zones. An empty
object uses core defaults. Configurations are limited to 262,144 UTF-16 code units.

## Insert a Fretzee Studio sheet

Copy the complete JSON export from Studio, including its `type: "fretzee_sheet"`
and nested `sheet` object, into a fenced `fretzee` block. The existing processor
automatically detects the sheet. A `fretzee_sheet` fence works the same way.
You do not need to split or rewrite the export, remove thumbnails, or duplicate
its diagram configurations.

For example, this valid export shows four default boards in one row:

````markdown
```fretzee
{
  "version": "1.0",
  "type": "fretzee_sheet",
  "sheet": {
    "title": "Four diagrams",
    "layout": {
      "columns": 4,
      "gapX": 28,
      "gapY": 32,
      "padding": 32,
      "background": "light",
      "titleAlign": "center"
    },
    "items": [
      { "config": { "title": "First" } },
      { "config": { "title": "Second" } },
      { "config": { "title": "Third" } },
      { "config": { "title": "Fourth" } }
    ]
  }
}
```
````

The declared column count (1–8), order, column spans, gaps, padding, background,
header alignment, title/subtitle visibility, and supported item display options
are retained. Columns remain fixed in narrow notes and diagrams shrink to fit.
Canonical sheet objects with `items` are also accepted. Each sheet supports
1–64 diagrams, with gaps and padding between 0 and 512 pixels. The total JSON
limit remains 262,144 UTF-16 code units, including cached preview fields.

Diagram configurations come from each item's `config`, falling back to `payload`
only when a config is absent. Cached thumbnail SVG is never inserted into the
note. Item labels and titles are preserved, including an item title when its
configuration has none. `overrides.orientation` applies unless overridden by the
item; `overrides.uniformScale` uses Studio's default spacing (30/60) unless false.
Original marker colors are retained. Nested sheets and non-null color-palette
overrides produce explicit errors in this version.

The sheet is composed from separate, unmodified SVG images. The outer background
is retained, including transparency. For dark vault themes, choose a light sheet
background in Studio if the diagram's configured text and fret colors are dark;
the plugin does not recolor the drawing.

## Rendering, themes and limitations

Reading view and Obsidian's code block rendering in Live Preview use the same
processors. Source mode keeps the block text visible. Diagram and tablature engines produce SVG images;
no untrusted configuration is inserted as note HTML. The Fretzee SVG is serialized
unchanged through native `outerHTML`. Do not switch to `XMLSerializer`: core 0.3.6
already declares `xmlns`, which that serializer can duplicate.

Guitar Pro SVG images include Bravura as a data URL so musical symbols need no
external font files. The notation uses a light paper surface in both themes. Explicit score/tab modes
use private rendering data so the imported staff settings remain unchanged.
Fretboard diagram colors remain those in your configuration; choose colors with
sufficient contrast for your vault's theme.

Audio playback, nested sheets, external JSON files, automatic SVG file export,
Studio ID lookups and conversion of tablature notes into fretboard diagrams are
outside this version. The plugin implements no network requests or telemetry.

## Development

Use Node.js 24.15+ LTS or 26+. Packaging also requires the `zip` command.

```sh
npm ci
npm run check
npm run spec:validate
npm run package
```

`npm run dev` watches and rebuilds `main.js`. `npm run package` creates a complete
`dist/fretzee` folder and versioned ZIP. Only `obsidian` is external at runtime.
The project has its own MIT license, dependency lock, tests, and OpenSpec contracts.
`npm run lint` includes the official Obsidian recommended ESLint rules with zero
warnings allowed. GitHub Actions runs the checks from a clean lockfile install.
For release steps and the exact asset/tag contract, see [releasing](docs/releasing.md).

Automated checks exercise real Guitar Pro export/import, selected tracks and
measures, notation modes, embedded fonts, invalid input, stale reads, vault events,
modal insertion, zoom and compact headers, literal chord grids, four-column sheet
grids and spans, unchanged Fretzee rendering, and CommonJS loading in a browser
host simulation. Before releasing, smoke-test actual Obsidian Reading view and
Live Preview, insertion/cancellation, file updates, light/dark themes, narrow
layouts and disabling/re-enabling the plugin. Verify mobile on devices before
changing the desktop-only manifest declaration.

References: [Obsidian code block processors](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Editor/Markdown%20post%20processing.md),
[AlphaTab low-level rendering](https://docs.alphatab.net/docs/guides/lowlevel-apis),
[notation zoom](https://alphatab.net/docs/reference/settings/display/scale/),
[notation visibility](https://alphatab.net/docs/reference/settings/notation/elements/),
and [OpenSpec contracts](openspec/specs/obsidian-diagrams/spec.md).

## License

The plugin's own source is MIT licensed. Bundled Fretzee is MIT licensed,
AlphaTab is MPL-2.0, and Bravura is SIL OFL-1.1. Their original terms continue to
apply. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
The standard `main.js` embeds the complete license texts and source notice;
manual ZIP distributions additionally include separate license files.
