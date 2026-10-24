import type { FretboardOptions } from 'fretzee';

const MAX_SOURCE_LENGTH = 256 * 1024;

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse bounded JSON without injecting or transforming the source. */
export function readConfiguration(source: string): Record<string, unknown> {
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new Error('Configuration exceeds the 262,144-character text limit.');
  }
  if (!source.trim()) {
    throw new Error('Paste a Fretzee JSON configuration inside this code block.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'check the syntax.'}`);
  }
  if (!isObject(parsed)) {
    throw new Error('The configuration must be a JSON object.');
  }

  return parsed;
}

/** Identify exported or canonical sheets before trying the single-diagram renderer. */
export function isSheetConfiguration(value: Record<string, unknown>): boolean {
  return value.type === 'fretzee_sheet' || value.type === 'sheet' || 'sheet' in value || 'items' in value || 'diagrams' in value;
}

/** Parse a raw Fretzee configuration or a Studio diagram record. */
export function parseConfiguration(source: string): FretboardOptions {
  const parsed = readConfiguration(source);
  const config = 'config' in parsed ? parsed.config : parsed;
  if (!isObject(config)) {
    throw new Error('The config property must contain a JSON object.');
  }
  // Single-diagram callers must not silently interpret sheets as default fretboards.
  if ('diagrams' in config || 'items' in config || 'sheet' in config || config.type === 'sheet' || config.type === 'fretzee_sheet') {
    throw new Error('Expected a single diagram configuration, not a sheet.');
  }
  return config;
}
