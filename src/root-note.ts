import { isMarkdown, safePath, type VaultFile } from './publishing-protocol';
import { noteMetadata, type NoteSource } from './note-bundle';
const parent = (path: string): string => path.split('/').slice(0, -1).join('/');

/** Resolve a selected resource to the closest explicitly marked editorial main note. */
export async function resolveMainNote(source: NoteSource, selected: string, folder: boolean): Promise<{ main?: VaultFile; candidates: VaultFile[]; preferred?: string }> {
  const directory = folder ? (selected === '/' ? '' : selected) : parent(selected);
  if (directory) safePath(directory);
  const markdown = source.files().filter(file => {
    try { safePath(file.path); return isMarkdown(file); } catch { return false; }
  });
  const candidates = markdown.filter(file => parent(file.path) === directory).sort((a, b) => a.path.localeCompare(b.path));
  let current = directory;
  for (;;) {
    const mains: VaultFile[] = [];
    for (const file of markdown.filter(item => parent(item.path) === current)) {
      if (noteMetadata(await source.text(file)).metadata['fretzee-type'] === 'document') mains.push(file);
    }
    if (mains.length > 1) throw new Error(`Multiple Fretzee main notes in ${current || '/'}. Keep one fretzee-type: document per directory.`);
    if (mains[0]) return { main: mains[0], candidates };
    if (!current) break;
    current = parent(current);
  }
  if (!candidates.length) throw new Error('Choose a directory containing an editorial Markdown note.');
  return { candidates, preferred: folder ? candidates[0]!.path : candidates.find(file => file.path === selected)?.path || candidates[0]!.path };
}
