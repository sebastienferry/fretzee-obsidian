import { importer, rendering, Settings, PlayerMode, NotationElement, model } from '@coderline/alphatab';
import bravuraFont from '@coderline/alphatab/font/Bravura.woff2';
import { normalizePath, TFile, type App } from 'obsidian';

import { optionalText, readOption } from './block-options';

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_EXCERPT_BARS = 128;

export interface ExcerptConfiguration {
  file: string;
  track: number;
  bars: string;
  profile: 'tab' | 'score' | 'default';
  zoom?: number;
  minimal?: boolean;
  title?: string;
}

/** Identify the Guitar Pro formats supported by the bundled importer. */
export function isGuitarProFile(file: Pick<TFile, 'extension'>): boolean {
  return ['gp', 'gp3', 'gp4', 'gp5', 'gpx'].includes(file.extension.toLowerCase());
}

/** Parse an inclusive, one-based range without silently changing the selection. */
export function parseBars(value: string): { start: number; end: number } {
  const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(value.trim());
  const start = match ? Number(match[1]) : NaN;
  const end = match ? Number(match[2] ?? match[1]) : NaN;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
    throw new Error('Measures must be an inclusive range such as 1-8, starting at 1.');
  }
  if (end - start + 1 > MAX_EXCERPT_BARS) {
    throw new Error(`Select at most ${MAX_EXCERPT_BARS} measures per excerpt.`);
  }
  return { start, end };
}

function isVaultRelativePath(path: unknown): path is string {
  return typeof path === 'string' && Boolean(path.trim()) && !/[:\\]/.test(path)
    && ![...path].some(character => character.charCodeAt(0) < 32)
    && path.split('/').every(part => Boolean(part) && part !== '.' && part !== '..');
}

/** Validate first, then match Obsidian's canonical vault index without changing source files. */
export function normalizeVaultPath(path: unknown): string {
  const message = 'File must be an exact path relative to the vault root, without ../ or a URL.';
  if (!isVaultRelativePath(path)) throw new Error(message);
  const normalized = normalizePath(path);
  if (!isVaultRelativePath(normalized)) throw new Error(message);
  return normalized;
}

/** Validate JSON or flat key/value options with portable vault-relative paths. */
export function parseExcerptConfiguration(source: string): ExcerptConfiguration {
  if (source.length > 16384) throw new Error('Tablature configuration is too large.');
  let value: unknown;
  if (source.trimStart().startsWith('{') || source.trimStart().startsWith('[')) {
    try { value = JSON.parse(source); } catch { throw new Error('Invalid tablature JSON.'); }
  } else {
    const options: Record<string, unknown> = {};
    for (const line of source.split(/\r?\n/).filter(line => line.trim())) {
      readOption(line, options, ['file', 'track', 'bars', 'profile', 'zoom', 'minimal', 'title']);
    }
    // A single unquoted measure is still a measure-range string.
    if (typeof options.bars === 'number') options.bars = String(options.bars);
    value = options;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a tablature JSON object.');
  const record = value as Record<string, unknown>;
  if (typeof record.file !== 'string' || !record.file.trim() || /[:\\]/.test(record.file) || record.file.startsWith('/') || [...record.file].some(character => character.charCodeAt(0) < 32) || record.file.split('/').some(part => !part)) {
    throw new Error('File must be a vault path or a path relative to the note.');
  }
  const file = record.file.normalize('NFC');
  const track = record.track ?? 1;
  if (typeof track !== 'number' || !Number.isSafeInteger(track) || track < 1) throw new Error('Track must be a number starting at 1.');
  if (typeof record.bars !== 'string') throw new Error('Measures must be a string such as "1-8".');
  parseBars(record.bars);
  const profile = record.profile ?? 'tab';
  if (profile !== 'tab' && profile !== 'score' && profile !== 'default') throw new Error('Profile must be tab, score, or default.');
  const zoom = record.zoom;
  if (zoom !== undefined && (typeof zoom !== 'number' || !Number.isFinite(zoom) || zoom < 0.25 || zoom > 3)) {
    throw new Error('Zoom must be a number between 0.25 and 3 (1 is normal size).');
  }
  const minimal = record.minimal;
  if (minimal !== undefined && typeof minimal !== 'boolean') throw new Error('Minimal must be true or false.');
  const title = optionalText(record.title, 'Title');
  return { file, track, bars: record.bars, profile,
    ...(zoom !== undefined ? { zoom: zoom } : {}),
    ...(minimal !== undefined ? { minimal: minimal } : {}),
    ...(title !== undefined ? { title } : {}),
  };
}

/** Read only a supported file in the active vault; never resolve through network or OS paths. */
export function resolveScorePath(app: App, reference: string, sourcePath = ''): string {
  if (!sourcePath) return normalizeVaultPath(reference);
  const linked = app.metadataCache.getFirstLinkpathDest(reference, sourcePath);
  if (linked) return normalizeVaultPath(linked.path);
  const parts = sourcePath.split('/').slice(0, -1);
  for (const part of reference.split('/')) {
    if (part === '.') continue;
    if (part === '..') { if (!parts.length) throw new Error('File path escapes the vault.'); parts.pop(); }
    else parts.push(part);
  }
  return normalizeVaultPath(parts.join('/'));
}

/** Read the exact resolved vault score without changing its bytes. */
export async function loadVaultScore(app: App, path: string, sourcePath = ''): Promise<model.Score> {
  const canonicalPath = resolveScorePath(app, path, sourcePath);
  const file = app.vault.getAbstractFileByPath(canonicalPath);
  if (!(file instanceof TFile)) throw new Error(`Guitar Pro file not found in the vault: ${path}`);
  if (!isGuitarProFile(file)) throw new Error('Choose a Guitar Pro file (.gp, .gp3, .gp4, .gp5, or .gpx).');
  if (file.stat.size > MAX_FILE_SIZE) throw new Error('Guitar Pro file exceeds the 20 MiB limit.');
  const bytes = new Uint8Array(await app.vault.readBinary(file));
  if (bytes.byteLength > MAX_FILE_SIZE) throw new Error('Guitar Pro file exceeds the 20 MiB limit.');
  try {
    const score = importer.ScoreLoader.loadScoreFromBytes(bytes);
    if (!score.tracks.length || !score.masterBars.length) throw new Error('Empty score.');
    return score;
  } catch {
    throw new Error('Unable to read this Guitar Pro file. Check that it is downloaded locally and is not corrupt.');
  }
}

/** Check the selection against the imported score before rendering or insertion. */
export function validateSelection(score: model.Score, config: ExcerptConfiguration): void {
  const { end } = parseBars(config.bars);
  if (!Number.isInteger(config.track) || config.track < 1 || config.track > score.tracks.length) {
    throw new Error(`Track must be between 1 and ${score.tracks.length}.`);
  }
  if (end > score.masterBars.length) throw new Error(`This file has ${score.masterBars.length} measures.`);
  const track = score.tracks[config.track - 1]!;
  if (config.profile === 'tab' && !track.staves.some(staff => !staff.isPercussion && staff.isStringed)) {
    throw new Error('This track has no string tuning. Select score or score and tablature notation.');
  }
}

/** Render the chosen track and bars as self-contained SVG chunks, including the music font. */
export function renderExcerpt(score: model.Score, config: ExcerptConfiguration, width: number): string[] {
  validateSelection(score, config);
  const { start, end } = parseBars(config.bars);
  const settings = new Settings();
  settings.core.engine = 'svg';
  settings.core.enableLazyLoading = false;
  settings.core.useWorkers = false;
  settings.player.playerMode = PlayerMode.Disabled;
  settings.display.scale = config.zoom ?? 1;
  if (config.minimal) {
    for (const element of [NotationElement.ScoreTitle, NotationElement.ScoreSubTitle,
      NotationElement.ScoreArtist, NotationElement.ScoreAlbum, NotationElement.ScoreWords,
      NotationElement.ScoreMusic, NotationElement.ScoreWordsAndMusic, NotationElement.ScoreCopyright,
      NotationElement.GuitarTuning, NotationElement.TrackNames, NotationElement.ChordDiagrams]) {
      settings.notation.elements.set(element, false);
    }
  }
  settings.display.startBar = start;
  settings.display.barCount = end - start + 1;
  // Explicit profiles use private render data so the imported score remains unchanged.
  const displayScore = config.profile === 'default' ? score
    : model.JsonConverter.jsObjectToScore(model.JsonConverter.scoreToJsObject(score));
  if (config.profile !== 'default') {
    for (const staff of displayScore.tracks[config.track - 1]!.staves) {
      staff.showStandardNotation = config.profile === 'score';
      staff.showTablature = config.profile === 'tab' && staff.isStringed && !staff.isPercussion;
      staff.showSlash = false; staff.showNumbered = false;
    }
  }
  const renderer = new rendering.ScoreRenderer(settings);
  renderer.width = Math.max(320, Math.min(1200, Number.isFinite(width) && width > 0 ? width : 900));
  const chunks: string[] = [];
  let renderError: Error | undefined;
  renderer.error.on(error => { renderError = error; });
  const size = settings.display.resources.engravingSettings.musicFontSize;
  const style = `<style>@font-face{font-family:FretzeeBravura;src:url("${bravuraFont}") format("woff2")} .at{font-family:FretzeeBravura;font-size:${size}px;font-style:normal;font-weight:normal}</style>`;
  renderer.partialRenderFinished.on(result => {
    if (typeof result.renderResult === 'string') {
      // AlphaTab's CSS-font SVG needs its font inside the image's isolated SVG document.
      chunks.push(result.renderResult.includes('class="at"')
        ? result.renderResult.replace(/(<svg\b[^>]*>)/, `$1${style}`) : result.renderResult);
    }
  });
  try {
    renderer.renderScore(displayScore, [config.track - 1]);
    if (renderError) throw renderError;
    if (!chunks.length) throw new Error('No tablature could be rendered for this selection.');
    return chunks;
  } finally {
    renderer.destroy();
  }
}

/** Serialize an excerpt as editable Markdown without changing the Guitar Pro source. */
export function excerptBlock(config: ExcerptConfiguration): string {
  return `\`\`\`tablature\n${JSON.stringify({ ...config, file: normalizeVaultPath(config.file) }, null, 2)}\n\`\`\`\n`;
}
