import { installHostDom } from './obsidian-stub.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInContext } from 'node:vm';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import * as host from './obsidian-stub.mjs';

test('the CommonJS distribution loads with only the host API and renders offline', async () => {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }); installHostDom(dom);
  try {
    const module = { exports: {} };
    const imports = [];
    const context = dom.getInternalVMContext();
    Object.assign(context, {
      module, exports: module.exports, TextDecoder, TextEncoder,
      require: (name) => {
        imports.push(name);
        assert.equal(name, 'obsidian', 'No other runtime dependency may be external.');
        return host;
      },
    });
    const bundle = await readFile('.test-build/main.cjs', 'utf8');
    for (const notice of ['Mozilla Public License Version 2.0', 'SIL OPEN FONT LICENSE Version 1.1',
      'Steinberg Media Technologies GmbH', 'Daniel Kuschny', 'https://github.com/CoderLine/alphaTab/tree/v1.8.4']) {
      assert.ok(bundle.includes(notice), `Standard install retains ${notice}`);
    }
    try { runInContext(bundle, context); }
    catch (error) { throw new Error(`CommonJS load failed: ${error.message}`); }
    const plugin = new module.exports.default();
    plugin.onload();
    const element = dom.window.document.createElement('div');
    plugin.processors.get('fretzee')('{"title":"Offline bundle"}', element);
    assert.ok(imports.length > 0 && imports.every(name => name === 'obsidian'));
    const image = element.querySelector('img');
    assert.ok(image);
    assert.equal(image.alt, 'Offline bundle');
    const xml = decodeURIComponent(image.src.slice(image.src.indexOf(',') + 1));
    const svg = new dom.window.DOMParser().parseFromString(xml, 'image/svg+xml');
    assert.equal(svg.documentElement.localName, 'svg');
    assert.ok(svg.querySelector('text').textContent.includes('Offline bundle'));
    const sheet = { type: 'fretzee_sheet', version: '1.0', sheet: { layout: { columns: 4 }, items: Array.from({ length: 4 }, (_, index) => ({ config: { title: `Chord ${index + 1}` } })) } };
    plugin.processors.get('fretzee_sheet')(JSON.stringify(sheet), element);
    assert.equal(element.querySelectorAll('img').length, 4);
    assert.equal(element.querySelector('.fretzee-sheet-grid').style.gridTemplateColumns, 'repeat(4, minmax(0, 1fr))');
    const chords = dom.window.document.createElement('div');
    plugin.processors.get('chords')('title: Offline progression\nkey: G\n| I / V | IV |\n| G / D | C |', chords);
    assert.equal(chords.querySelectorAll('td').length, 4);
    assert.equal(chords.querySelector('strong').textContent, 'Offline progression');
  } finally {
    dom.window.close();
  }
});
