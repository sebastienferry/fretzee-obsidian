import { documentWindow } from './dom';
import { hasControlCharacters, optionalText, readOption } from './block-options';

export interface ChordProgression {
  title?: string;
  key?: string;
  rows: string[][];
}

/** Parse literal measure rows without transposition, markup, or harmonic inference. */
export function parseChords(source: string): ChordProgression {
  if (source.length > 16384) throw new Error('Chord configuration is too large.');
  const metadata: Record<string, unknown> = {};
  const rows: string[][] = [];
  for (const original of source.split(/\r?\n/)) {
    const line = original.trim();
    if (!line) continue;
    if (!line.startsWith('|')) {
      if (rows.length) throw new Error('Place title and key before the measure rows.');
      readOption(line, metadata, ['title', 'key']);
      continue;
    }
    if (!line.endsWith('|') || line.length < 3) throw new Error('Each row must start and end with |.');
    const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
    if (cells.some(cell => !cell || cell.length > 200 || hasControlCharacters(cell))) {
      throw new Error('Each measure must contain 1–200 printable characters.');
    }
    if (rows.length >= 32 || cells.length > 32 || (rows.length + 1) * cells.length > 256) {
      throw new Error('Use at most 32 rows, 32 measures per row and 256 cells.');
    }
    if (rows.length && cells.length !== rows[0]!.length) throw new Error('All chord rows must have the same number of measures.');
    rows.push(cells);
  }
  if (!rows.length) throw new Error('Add at least one measure row, such as | G / D | C |.');
  return { title: optionalText(metadata.title, 'Title'), key: optionalText(metadata.key, 'Key', 40), rows };
}

/** Display accessible, theme-aware chord measures using text nodes only. */
export function renderChords(source: string, container: HTMLElement): void {
  container.replaceChildren();
  container.classList.add('fretzee-chords');
  container.classList.remove('fretzee-block-error');
  const doc = container.ownerDocument;
  try {
    const progression = parseChords(source);
    const figure = documentWindow(doc).createEl('figure');
    if (progression.title || progression.key) {
      const caption = documentWindow(doc).createEl('figcaption');
      if (progression.title) {
        const title = documentWindow(doc).createEl('strong'); title.textContent = progression.title; caption.appendChild(title);
      }
      if (progression.key) {
        const key = documentWindow(doc).createSpan(); key.className = 'fretzee-chords-key';
        key.textContent = `Key: ${progression.key}`; caption.appendChild(key);
      }
      figure.appendChild(caption);
    }
    const table = documentWindow(doc).createEl('table');
    table.setAttribute('aria-label', progression.title ?? 'Chord progression');
    table.style.minWidth = `${progression.rows[0]!.length * 80}px`;
    const body = documentWindow(doc).createEl('tbody');
    progression.rows.forEach(row => {
      const tr = documentWindow(doc).createEl('tr');
      row.forEach(measure => {
        const cell = documentWindow(doc).createEl('td'); cell.textContent = measure; tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    table.appendChild(body); figure.appendChild(table); container.appendChild(figure);
  } catch (error) {
    container.classList.add('fretzee-block-error');
    const message = documentWindow(doc).createEl('p'); message.setAttribute('role', 'alert');
    message.textContent = `Fretzee: ${error instanceof Error ? error.message : 'Unable to render chords.'}`;
    container.appendChild(message);
  }
}
