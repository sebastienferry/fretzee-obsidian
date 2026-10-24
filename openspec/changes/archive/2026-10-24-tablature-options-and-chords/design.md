# Design

Use AlphaTab display.scale for zoom (0.25–3, default 1) and notation.elements to hide score metadata, tuning, track labels and chord-diagram headers in minimal mode (default false). Preserve notation, rhythm, effects and bar numbers. An optional explicit block title remains visible above the excerpt even in minimal mode. Do not rewrite SVG output or mutate imported scores.

Accept existing JSON and a deliberately restricted flat key/value syntax, without YAML nesting, aliases or execution. Validate numeric/boolean values, duplicates, known text fields and input sizes. File paths continue through the canonical vault validation boundary. The picker continues to insert JSON; users can edit presentation options in the block.

Render chords as a figure with optional caption and key metadata, and a semantic table with one row per pipe-delimited source row and one cell per measure. Keep roman numerals, chord names and slash rhythm markers exactly as supplied after outer whitespace trimming; no transposition or harmonic inference. Rows must have equal measure counts. Use textContent throughout and theme-aware CSS with horizontal scrolling in narrow notes. Limit input to 16,384 code units, 32 rows, 32 measures per row and 256 cells.
