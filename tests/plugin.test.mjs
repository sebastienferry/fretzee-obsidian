import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import FretzeePlugin from '../.test-build/main.mjs';

test('registers the diagram and tablature languages and insertion commands', () => {
  const plugin = new FretzeePlugin();
  plugin.onload();
  assert.deepEqual([...plugin.processors.keys()], ['fretzee', 'fretzee_sheet', 'tablature', 'chords']);
  assert.deepEqual(plugin.commands.map(command => command.id).sort(), ['insert-diagram', 'insert-tablature', 'open-documents', 'send-active-note']);
});

test('inserts a fenced example with paragraph boundaries and reports success', () => {
  globalThis.fretzeeNotices = [];
  const plugin = new FretzeePlugin();
  plugin.onload();
  let insertion;
  plugin.commands.find(command => command.id === 'insert-diagram').editorCallback({
    getCursor: () => ({ line: 0, ch: 4 }), getLine: () => 'Text after',
    replaceSelection: (text) => { insertion = text; },
  });
  assert.ok(insertion.startsWith('\n\n```fretzee\n'));
  assert.ok(insertion.endsWith('\n```\n\n'));
  assert.deepEqual(globalThis.fretzeeNotices, ['Fretzee diagram inserted.']);
});

test('reports insertion failures without crashing the editor', () => {
  globalThis.fretzeeNotices = [];
  const plugin = new FretzeePlugin();
  plugin.onload();
  plugin.commands.find(command => command.id === 'insert-diagram').editorCallback({ getCursor: () => { throw new Error('Editor unavailable'); } });
  assert.deepEqual(globalThis.fretzeeNotices, ['Unable to insert the Fretzee diagram.']);
});

test('inserts an unindented fence after indentation and at the start of a line', () => {
  globalThis.fretzeeNotices = [];
  const plugin = new FretzeePlugin();
  plugin.onload();
  for (const ch of [0, 4]) {
    let insertion;
    plugin.commands.find(command => command.id === 'insert-diagram').editorCallback({
      getCursor: () => ({ line: 0, ch }),
      replaceSelection: (text) => { insertion = text; },
    });
    assert.ok(insertion.startsWith(ch > 0 ? '\n\n```fretzee' : '```fretzee'));
  }
});

test('release metadata stays aligned', async () => {
  const require = createRequire(import.meta.url);
  const manifest = require('../manifest.json');
  const pkg = require('../package.json');
  const versions = require('../versions.json');
  assert.equal(manifest.version, pkg.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
  assert.equal(manifest.isDesktopOnly, true);
  const build = await readFile('esbuild.config.mjs', 'utf8');
  assert.ok(build.includes("external: ['obsidian']"));
});
