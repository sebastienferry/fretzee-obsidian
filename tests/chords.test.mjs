import { installHostDom } from './obsidian-stub.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { parseChords, renderChords } from '../.test-build/chords.mjs';
import FretzeePlugin from '../.test-build/main.mjs';

const example = "title: Progression d'accords\nkey: G\n| I / V | IV |\n| G / D | C  |";

test('renders literal roman numerals and chords in aligned measures with title and key', () => {
  const parsed = parseChords(example);
  assert.equal(parsed.title, "Progression d'accords"); assert.equal(parsed.key, 'G');
  assert.deepEqual(parsed.rows, [['I / V', 'IV'], ['G / D', 'C']]);
  const dom = new JSDOM('<div id="block"></div>'); installHostDom(dom);
  try {
    const element = dom.window.document.getElementById('block');
    const plugin = new FretzeePlugin(); plugin.onload();
    plugin.processors.get('chords')(example, element);
    assert.equal(element.querySelector('figcaption strong').textContent, "Progression d'accords");
    assert.equal(element.querySelector('.fretzee-chords-key').textContent, 'Key: G');
    assert.equal(element.querySelectorAll('tr').length, 2);
    assert.deepEqual([...element.querySelectorAll('tr')].map(row => row.cells.length), [2, 2]);
    assert.deepEqual([...element.querySelectorAll('td')].map(cell => cell.textContent), ['I / V', 'IV', 'G / D', 'C']);
    assert.equal(element.querySelector('table').getAttribute('aria-label'), parsed.title);
  } finally { dom.window.close(); }
});

test('accepts optional metadata, quoted strings, blank lines and accidentals without inference', () => {
  assert.deepEqual(parseChords('| F#m7 / B7 | Emaj7 |').rows, [['F#m7 / B7', 'Emaj7']]);
  const config = parseChords("\ntitle: 'Player''s changes'\nkey: \"Bb minor\"\n\n| bVII / V7 | i |\n");
  assert.equal(config.title, "Player's changes"); assert.equal(config.key, 'Bb minor');
  assert.deepEqual(config.rows, [['bVII / V7', 'i']]);
});

test('rejects malformed grids, duplicates and unsupported syntax with bounded input', () => {
  for (const text of ['', 'title: Empty', '| G |\n| C | D |', '| G', 'G |', '| |', 'key: G\nkey: D\n| C |',
    '| G |\nkey: C', 'tempo: 120\n| G |', 'title: {nested: value}\n| G |', 'title: "unfinished\n| G |',
    '| '+ 'G'.repeat(201) +' |', '| G\u0000 |', 'x'.repeat(16385),
    Array(33).fill('| G |').join('\n'), '| '+Array(33).fill('G').join(' | ')+' |',
    Array(17).fill('| '+Array(16).fill('G').join(' | ')+' |').join('\n')]) {
    assert.throws(() => parseChords(text), undefined, text.slice(0, 80));
  }
});

test('untrusted labels remain text and invalid blocks do not affect another progression', () => {
  const dom = new JSDOM('<div id="a"></div><div id="b"></div>'); installHostDom(dom);
  try {
    const [a, b] = ['a','b'].map(id => dom.window.document.getElementById(id));
    renderChords('title: <img src=x onerror=alert(1)>\nkey: <svg/onload=alert(1)>\n| <script>alert(1)</script> |', a);
    assert.equal(a.querySelector('script, img, svg'), null);
    assert.ok(a.textContent.includes('<script>'));
    renderChords('| G', a); renderChords(example, b);
    assert.ok(a.querySelector('[role="alert"]')); assert.equal(b.querySelectorAll('td').length, 4);
    renderChords('| Am |', a);
    assert.equal(a.querySelector('[role="alert"]'), null); assert.equal(a.classList.contains('fretzee-block-error'), false);
  } finally { dom.window.close(); }
});
