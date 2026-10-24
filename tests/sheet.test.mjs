import { installHostDom } from './obsidian-stub.mjs';
import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { Fretboard } from 'fretzee';
import { renderCodeBlock } from '../.test-build/diagram.mjs';
import { parseSheet, renderSheet } from '../.test-build/sheet.mjs';

let dom;
beforeEach(() => { dom = new JSDOM('<!doctype html><body></body>'); installHostDom(dom); globalThis.document = dom.window.document; });
afterEach(() => { dom.window.close(); delete globalThis.document; });

function fixture(count = 4) {
  return { version: '1.0', type: 'fretzee_sheet', sheet: {
    title: 'Four chords', subtitle: 'Practice', showTitle: true, showSubtitle: true,
    layout: { columns: 4, gapX: 28, gapY: 32, padding: 32, background: 'transparent', titleAlign: 'center' },
    overrides: { orientation: null, colorScheme: null },
    items: Array.from({ length: count }, (_, index) => ({
      title: ['Am', 'C', 'D', 'G'][index % 4], isSheet: false, type: 'diagram',
      config: { title: ['Am', 'C', 'D', 'G'][index % 4], stringCount: 6, fretCount: 4, orientation: 'horizontal',
        fingerings: [{ string: 2, fret: 1, text: 'R', color: '#00f5d4' }], thumbnail: '<svg onload="alert(1)"></svg>' },
      payload: { title: 'Duplicate data must be ignored' },
    })),
  } };
}
function imageXml(image) { return decodeURIComponent(image.src.slice(image.src.indexOf(',') + 1)); }
function imageDocument(image) { return new dom.window.DOMParser().parseFromString(imageXml(image), 'image/svg+xml'); }

test('renders the complete export as an ordered four-column sheet with its declared layout', () => {
  const container = document.createElement('div');
  renderCodeBlock(JSON.stringify(fixture()), container);
  const figure = container.querySelector('figure');
  assert.ok(figure); assert.equal(figure.dataset.columns, '4'); assert.equal(figure.style.padding, '32px');
  assert.equal(figure.style.backgroundColor, 'transparent');
  assert.equal(figure.querySelector('figcaption').style.textAlign, 'center');
  assert.equal(figure.querySelector('h3').textContent, 'Four chords');
  assert.equal(figure.querySelector('p').textContent, 'Practice');
  const grid = figure.querySelector('.fretzee-sheet-grid');
  assert.equal(grid.style.gridTemplateColumns, 'repeat(4, minmax(0, 1fr))');
  assert.equal(grid.style.columnGap, '28px'); assert.equal(grid.style.rowGap, '32px');
  assert.deepEqual([...figure.querySelectorAll('img')].map(image => image.alt), ['Am', 'C', 'D', 'G']);
  assert.equal(container.querySelector('svg, script, [onload]'), null);
});

test('supports canonical sheets, multiple rows and merged cells without reordering', () => {
  const sheet = fixture(6).sheet; sheet.type = 'sheet'; sheet.items[0].colSpan = 2;
  const result = renderSheet(sheet, document);
  assert.equal(result.querySelectorAll('img').length, 6);
  const cells = [...result.querySelectorAll('.fretzee-sheet-item')];
  assert.equal(cells[0].style.gridColumn, 'span 2');
  assert.deepEqual(cells.map(cell => cell.dataset.itemIndex), ['0', '1', '2', '3', '4', '5']);
});

test('retains original marker colors and the exact core SVG without mutating the export', () => {
  const input = fixture(); const before = JSON.stringify(input);
  input.sheet.overrides.uniformScale = false;
  const result = renderSheet(input, document);
  const expected = new Fretboard(input.sheet.items[0].config).render().outerHTML;
  assert.equal(imageXml(result.querySelector('img')), expected);
  assert.ok(imageDocument(result.querySelector('img')).querySelector('[fill="#00f5d4"]'));
  delete input.sheet.overrides.uniformScale;
  assert.equal(JSON.stringify(input), before);
});

test('applies item orientation before sheet overrides and matches uniform-spacing behavior', () => {
  const input = fixture(); input.sheet.overrides.orientation = 'vertical';
  input.sheet.items[0].orientation = 'horizontal';
  const parsed = parseSheet(input);
  assert.equal(parsed.items[0].config.orientation, 'horizontal');
  assert.equal(parsed.items[1].config.orientation, 'vertical');
  assert.equal(parsed.items[1].config.stringSpacing, 30); assert.equal(parsed.items[1].config.fretSpacing, 60);
  input.sheet.overrides.uniformScale = false; input.sheet.items[1].config.stringSpacing = 23;
  assert.equal(parseSheet(input).items[1].config.stringSpacing, 23);
});

test('respects title visibility, labels, missing config titles and subtitle visibility', () => {
  const input = fixture(); input.sheet.showTitle = false; input.sheet.showSubtitle = false;
  input.sheet.items[0].label = 'Custom chord'; delete input.sheet.items[1].config.title;
  input.sheet.items[2].showTitle = false; input.sheet.items[2].config.subtitle = 'Hidden'; input.sheet.items[2].showSubtitle = false;
  const result = renderSheet(input, document); const images = [...result.querySelectorAll('img')];
  assert.equal(result.querySelector('figcaption'), null);
  assert.equal(images[0].alt, 'Custom chord'); assert.equal(images[1].alt, 'C');
  assert.equal(imageDocument(images[2]).querySelector('.fretzee-title'), null);
  assert.equal(imageDocument(images[2]).documentElement.textContent.includes('Hidden'), false);
});

test('supports explicit backgrounds and rejects CSS injection and unsafe text markup', () => {
  const input = fixture(); input.sheet.title = '<img src=x onerror=alert(1)>';
  input.sheet.layout.background = 'light';
  const result = renderSheet(input, document);
  assert.equal(result.style.backgroundColor, 'rgb(255, 255, 255)');
  assert.equal(result.querySelector('h3').textContent, input.sheet.title);
  assert.equal(result.querySelector('script, [onerror], svg'), null);
  input.sheet.layout.background = 'url(https://example.invalid/tracker)';
  assert.throws(() => renderSheet(input, document), /CSS color/);
});

test('rejects invalid or unsupported sheet fields instead of drawing a default board', () => {
  for (const change of [
    sheet => { sheet.items = []; }, sheet => { sheet.items = Array(65).fill(sheet.items[0]); },
    sheet => { sheet.layout.columns = 0; }, sheet => { sheet.layout.columns = 9; }, sheet => { sheet.layout.columns = 1.5; },
    sheet => { sheet.layout.gapX = -1; }, sheet => { sheet.layout.gapY = Infinity; }, sheet => { sheet.layout.padding = '32'; },
    sheet => { sheet.items[0].colSpan = 5; }, sheet => { sheet.items[0].isSheet = true; },
    sheet => { delete sheet.items[0].config; delete sheet.items[0].payload; },
    sheet => { sheet.overrides.colorScheme = 'neon'; }, sheet => { sheet.overrides.orientation = 'diagonal'; },
  ]) {
    const input = fixture(); change(input.sheet); assert.throws(() => parseSheet(input));
  }
  assert.throws(() => parseSheet({ type: 'fretzee_sheet', version: '2.0', sheet: fixture().sheet }), /version/);
});

test('invalid children stay block-local and later diagram or sheet renders remove stale state', () => {
  const input = fixture(); input.sheet.items[2].config.fretCount = 1000;
  const container = document.createElement('div'); renderCodeBlock(JSON.stringify(input), container);
  assert.ok(container.querySelector('[role="alert"]').textContent.includes('item 3'));
  assert.equal(container.querySelector('img'), null);
  renderCodeBlock(JSON.stringify(fixture()), container); assert.equal(container.querySelectorAll('img').length, 4);
  renderCodeBlock('{}', container); assert.equal(container.querySelectorAll('img').length, 1);
  assert.equal(container.classList.contains('fretzee-sheet-block'), false);
});
