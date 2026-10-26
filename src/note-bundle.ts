import { documentWindow } from './dom';
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Nodes } from 'mdast';
import { parseYaml, stringifyYaml } from 'obsidian';
import { parseExcerptConfiguration } from './tablature';
import { LIMITS, base64, isMarkdown, safePath, type Upload, type VaultFile } from './publishing-protocol';

export const identityPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export interface NoteSource {
  files(): VaultFile[];
  text(file: VaultFile): Promise<string>;
  read(file: VaultFile): Promise<ArrayBuffer>;
  resolve(reference: string, note: VaultFile): VaultFile | null;
  cachedId(file: VaultFile): unknown;
}
export interface PreparedNote {
  file: VaultFile;
  id: string;
  originalHash: string;
  upload: Upload;
  fingerprint: string;
  dependencies: { source: string; path: string }[];
}
export async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await documentWindow(document).crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
}
export const textDigest = (text: string): Promise<string> => digest(new TextEncoder().encode(text));

/** Read author metadata without interpreting it as credentials or executable configuration. */
export function noteMetadata(source: string): { metadata: Record<string, unknown>; body: string; id?: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  let value: unknown = {};
  if (match) {
    try { value = parseYaml(match[1]!); } catch { throw new Error('The note frontmatter is invalid YAML.'); }
    if (value !== null && (typeof value !== 'object' || Array.isArray(value))) throw new Error('The note frontmatter must be a mapping.');
  }
  const metadata = record(value);
  if (metadata.fretzee !== undefined && (typeof metadata.fretzee !== 'object' || metadata.fretzee === null || Array.isArray(metadata.fretzee))) throw new Error('The fretzee frontmatter property must be a mapping.');
  const legacyId = record(metadata.fretzee).id;
  const flatId = metadata['fretzee-id'];
  if (flatId !== undefined && legacyId !== undefined && flatId !== legacyId) throw new Error('Conflicting flat and legacy Fretzee IDs.');
  const id = flatId ?? legacyId;
  const type = metadata['fretzee-type'];
  if (type !== undefined && type !== 'document' && type !== 'resource') throw new Error('fretzee-type must be document or resource.');
  if (id !== undefined && (typeof id !== 'string' || !identityPattern.test(id))) throw new Error('fretzee.id must be a valid lowercase UUID.');
  return { metadata, body: match ? source.slice(match[0].length) : source, ...(typeof id === 'string' ? { id } : {}) };
}

/** Rebase recognized references in one Markdown body, keeping code and authored text intact. */
async function rebaseBody(body: string, asset: (reference: string, required?: boolean) => Promise<string | null>): Promise<string> {
  const edits: { start: number; end: number; value: string }[] = [];
  const visit = async (node: Nodes): Promise<void> => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    if (node.type === 'code') {
      if (node.lang === 'tablature') {
        const config = parseExcerptConfiguration(node.value);
        config.file = (await asset(config.file, true))!;
        edits.push({ start, end, value: `\`\`\`tablature\n${JSON.stringify(config, null, 2)}\n\`\`\`` });
      }
      return;
    }
    if (node.type === 'inlineCode' || node.type === 'html') return;
    if (node.type === 'image' || node.type === 'link' || node.type === 'definition') {
      const path = await asset(node.url);
      if (path) {
        const anchor = node.url.includes('#') ? '#' + node.url.split('#').slice(1).join('#') : '';
        const destination = encodeURI(path) + anchor;
        const title = node.title ? ' ' + JSON.stringify(node.title) : '';
        if (node.type === 'definition') edits.push({ start, end, value: `[${node.label || node.identifier}]: ${destination}${title}` });
        else {
          const label = node.type === 'image' ? (node.alt || '').replace(/[[\]\\]/gu, '\\$&') : body.slice(node.children[0]?.position?.start.offset ?? start + 1, node.children[node.children.length - 1]?.position?.end.offset ?? start + 1);
          edits.push({ start, end, value: `${node.type === 'image' ? '!' : ''}[${label}](${destination}${title})` });
        }
        return;
      }
    }
    if (node.type === 'text') {
      const raw = body.slice(start, end);
      for (const match of raw.matchAll(/(!?)\[\[([^\]\n]+)\]\]/gu)) {
        const index = match.index;
        let slash = index - 1;
        while (slash >= 0 && raw[slash] === '\\') slash--;
        if ((index - 1 - slash) % 2) continue;
        const [target, ...alias] = match[2]!.split('|');
        const path = await asset(target!);
        if (path) {
          const anchor = target!.includes('#') ? '#' + target!.split('#').slice(1).join('#') : '';
          edits.push({ start: start + index, end: start + index + match[0].length, value: `${match[1]}[[${path}${anchor}${alias.length ? '|' + alias.join('|') : ''}]]` });
        }
      }
    }
    if ('children' in node) for (const child of node.children) await visit(child);
  };
  const ast = fromMarkdown(body);
  for (const child of ast.children) await visit(child);
  let exported = body;
  for (const edit of edits.sort((a, b) => b.start - a.start)) exported = exported.slice(0, edit.start) + edit.value + exported.slice(edit.end);
  return exported;
}

/** Export one portable note. Original vault bytes are never rewritten here. */
export async function prepareNote(source: NoteSource, file: VaultFile, id: string, folderRoot = false): Promise<PreparedNote> {
  safePath(file.path);
  const original = await source.text(file);
  if (new TextEncoder().encode(original).length > LIMITS.fileBytes) throw new Error('The note exceeds the 10 MiB limit.');
  const { metadata, body, id: existing } = noteMetadata(original);
  if (!identityPattern.test(id) || (existing && existing !== id)) throw new Error('The note identity changed. Prepare the send again.');
  const assets = new Map<string, { path: string; bytes: ArrayBuffer; file: VaultFile }>();
  const directory = file.path.split('/').slice(0, -1).join('/');
  const canonicalRoot = safePath(file.path);
  const inDirectory = (path: string): boolean => !directory || path.startsWith(directory + '/');
  const folderFiles = folderRoot ? source.files().filter(entry => {
    try { safePath(entry.path); return inDirectory(entry.path) && safePath(entry.path) !== canonicalRoot; } catch { return false; }
  }).sort((a, b) => a.path.localeCompare(b.path)) : [];
  if (folderFiles.length >= LIMITS.files) throw new Error('The main note directory exceeds the 200-file limit.');
  const usedPaths = new Map<string, string>();
  let total = new TextEncoder().encode(original).length;
  const addAsset = async (resolved: VaultFile): Promise<string> => {
    const canonical = safePath(resolved.path);
    if (assets.has(canonical)) return assets.get(canonical)!.path;
    if (assets.size + 1 >= LIMITS.files) throw new Error('A note can contain at most 199 attachments.');
    let path = `assets/${resolved.name.normalize('NFC')}`;
    if (usedPaths.has(path) && usedPaths.get(path) !== canonical) {
      const extension = resolved.name.lastIndexOf('.');
      path = `assets/${resolved.name.slice(0, extension)}-${(await textDigest(canonical)).slice(0, 12)}${resolved.name.slice(extension)}`;
    }
    safePath(path);
    const bytes = await source.read(resolved);
    total += bytes.byteLength;
    if (bytes.byteLength > LIMITS.fileBytes || total > LIMITS.totalBytes) throw new Error('The note and dependencies exceed the upload size limit.');
    usedPaths.set(path, canonical); assets.set(canonical, { path, bytes, file: resolved });
    return path;
  };
  const resolveAsset = async (reference: string, from: VaultFile, required = false): Promise<string | null> => {
    if (/^[a-z][a-z\d+.-]*:|^\/\//iu.test(reference)) {
      if (required) throw new Error('Tablature must reference a vault file.');
      return null;
    }
    const raw = reference.split('#')[0] || '';
    if (!raw) return null;
    let decoded: string;
    try { decoded = decodeURIComponent(raw); } catch { throw new Error('An attachment reference has invalid URL encoding.'); }
    const resolved = source.resolve(decoded, from);
    if (!resolved) {
      if (required || (/\.[^./]+$/u.test(decoded) && !/\.(md|markdown)$/iu.test(decoded))) throw new Error(`Referenced attachment is unavailable: ${decoded}`);
      return null;
    }
    if (safePath(resolved.path) === canonicalRoot) return 'note.md';
    if (isMarkdown(resolved) && (!folderRoot || !inDirectory(resolved.path))) {
      if (required) throw new Error('A tablature must reference a Guitar Pro file.');
      return null;
    }
    return addAsset(resolved);
  };
  const referenceFor = (from: VaultFile, reference: string, required = false): Promise<string | null> => resolveAsset(reference, from, required).then(path => {
    if (!path || required || safePath(from.path) === canonicalRoot) return path;
    return path === 'note.md' ? '../note.md' : path.slice('assets/'.length);
  });
  for (const entry of folderFiles) {
    if (isMarkdown(entry) && noteMetadata(await source.text(entry)).metadata['fretzee-type'] === 'document') throw new Error(`Multiple main notes in the container directory: ${entry.path}`);
    await addAsset(entry);
  }
  const asset = (reference: string, required = false): Promise<string | null> => referenceFor(file, reference, required);
  let exported = await rebaseBody(body, asset);
  for (const resource of assets.values()) {
    if (!isMarkdown(resource.file)) continue;
    const text = new TextDecoder('utf-8', { fatal: true }).decode(resource.bytes);
    const prefix = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u.exec(text)?.[0] || '';
    const rebased = prefix + await rebaseBody(text.slice(prefix.length), (reference, required = false) => referenceFor(resource.file, reference, required));
    resource.bytes = new TextEncoder().encode(rebased).buffer;
    if (resource.bytes.byteLength > LIMITS.fileBytes) throw new Error('An exported Markdown resource exceeds 10 MiB.');
  }
  const frontmatter: Record<string, unknown> = folderRoot ? { ...metadata, 'fretzee-type': 'document', 'fretzee-id': id } : { ...metadata, fretzee: { ...record(metadata.fretzee), id } };
  if (folderRoot && metadata.fretzee) {
    const legacy = { ...record(metadata.fretzee) }; delete legacy.id;
    if (Object.keys(legacy).length) frontmatter.fretzee = legacy;
    else delete frontmatter.fretzee;
  }
  exported = `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n${exported}`;
  const exportedBytes = new TextEncoder().encode(exported);
  if (exportedBytes.byteLength > LIMITS.fileBytes || exportedBytes.byteLength + [...assets.values()].reduce((size, item) => size + item.bytes.byteLength, 0) > LIMITS.totalBytes) throw new Error('The exported note and dependencies exceed the upload size limit.');
  const files = [{ path: 'note.md', content: base64(exportedBytes.buffer) }, ...[...assets.values()].map(item => ({ path: item.path, content: base64(item.bytes) }))].sort((a, b) => a.path.localeCompare(b.path));
  let title = file.basename.trim().normalize('NFC');
  while (new TextEncoder().encode(title).length > 200) title = [...title].slice(0, -1).join('');
  const upload: Upload = { schema: folderRoot ? 3 : 2, sourceKey: `note:${id}`, title, entry: 'note.md', files };
  return { file, id, originalHash: await textDigest(original), upload, fingerprint: await textDigest(JSON.stringify(upload)), dependencies: [...assets].map(([source, item]) => ({ source, path: item.path })) };
}
