/** Read a scalar in the supported flat key/value syntax, without YAML features. */
export function parseScalar(value: string): string | number | boolean {
  const text = value.trim();
  if (text.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === 'string') return parsed;
    } catch { /* Report the same readable scalar error below. */ }
    throw new Error('Invalid quoted value. Use a JSON string or plain text.');
  }
  if (text.startsWith("'")) {
    if (text.length < 2 || !text.endsWith("'") || /'(?!')/.test(text.slice(1, -1).replace(/''/g, ''))) {
      throw new Error('Invalid single-quoted value. Escape apostrophes by doubling them.');
    }
    return text.slice(1, -1).replace(/''/g, "'");
  }
  if (text === 'true' || text === 'false') return text === 'true';
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return Number(text);
  if (!text || /^[{[&*!>|]/.test(text)) throw new Error('Use a nonempty plain value; nested YAML is not supported.');
  return text;
}

/** Parse exactly one flat option line and reject duplicate or unknown keys. */
export function readOption(line: string, record: Record<string, unknown>, allowed: readonly string[]): void {
  const match = /^([a-zA-Z]+):\s*(.*)$/.exec(line.trim());
  if (!match || !allowed.includes(match[1]!)) throw new Error('Unsupported option. Use one supported key: value per line.');
  const key = match[1]!;
  if (Object.prototype.hasOwnProperty.call(record, key)) throw new Error(`Duplicate option: ${key}.`);
  record[key] = parseScalar(match[2]!);
}

/** Detect control characters without interpreting any markup. */
export function hasControlCharacters(value: string): boolean {
  return [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

/** Read optional bounded text without interpreting markup. */
export function optionalText(value: unknown, name: string, limit = 200): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > limit || hasControlCharacters(value)) {
    throw new Error(`${name} must be nonempty text of at most ${limit} characters on one line.`);
  }
  return value.trim();
}
