import { installHostDom } from './obsidian-stub.mjs';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { Fretboard } from 'fretzee';
import { parseConfiguration, renderCodeBlock, renderDiagram } from '../.test-build/diagram.mjs';
import { EXAMPLE_BLOCK } from '../.test-build/example.mjs';

let dom;
beforeEach(() => {
  dom = new JSDOM('<!doctype html><body></body>'); installHostDom(dom);
  globalThis.document = dom.window.document;
});
afterEach(() => {
  dom.window.close();
  delete globalThis.document;
});

test('accepts raw configurations, defaults, and wrapped Studio records without dropping options', () => {
  const config = { title: 'Bass', orientation: 'horizontal', stringCount: 4, customMetadata: 'retained' };
  assert.deepEqual(parseConfiguration(JSON.stringify(config)), config);
  assert.deepEqual(parseConfiguration(JSON.stringify({ title: 'Record title', config })), config);
  assert.deepEqual(parseConfiguration('{}'), {});
});

test('rejects malformed, oversized, non-object, and composite configurations', () => {
  for (const source of ['', '{', 'null', '[]', '42', 'true', '"text"', '{"config":[]}', '{"diagrams":[]}', '{"type":"sheet","items":[]}', '{"type":"fretzee_sheet","sheet":{}}']) {
    assert.throws(() => parseConfiguration(source), Error, source);
  }
  assert.throws(() => parseConfiguration(' '.repeat(262145)), /limit/);
});

for (const orientation of ['horizontal', 'vertical']) {
  for (const stringCount of [4, 6]) {
    test(`renders real ${orientation} ${stringCount}-string SVG with titles, tuning, markers and zones`, () => {
      const result = renderDiagram(JSON.stringify({
        title: 'Practice diagram', subtitle: 'Test subtitle', orientation, stringCount,
        fretCount: 5, startFret: 3, tuning: ['E', 'A', 'D', 'G', 'B', 'E'].slice(0, stringCount),
        fingerings: [{ string: 1, fret: 3, text: 'Root', color: '#123456' }],
        zones: [{ type: 'box', startString: 1, endString: 3, startFret: 3, endFret: 5, label: 'Triad' }],
      }));
      const svg = new dom.window.DOMParser().parseFromString(result.svg, 'image/svg+xml');
      assert.equal(svg.documentElement.localName, 'svg');
      assert.equal(svg.querySelector('parsererror'), null);
      assert.ok(svg.documentElement.getAttribute('viewBox'));
      for (const label of ['Practice diagram', 'Test subtitle', 'Root', 'Triad']) {
        assert.ok(svg.documentElement.textContent.includes(label), label);
      }
      assert.ok(svg.querySelector('[fill="#123456"]'));
      assert.equal(result.title, 'Practice diagram');
    });
  }
}

test('displays SVG in an image context and replaces previous output when rerendering', () => {
  const element = document.createElement('div');
  const source = JSON.stringify({ title: '<img src=x onerror=alert(1)>' });
  renderCodeBlock(source, element);
  const image = element.querySelector('img');
  assert.ok(image.src.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.equal(image.alt, '<img src=x onerror=alert(1)>');
  assert.equal(element.querySelectorAll('img').length, 1);
  assert.equal(element.querySelector('svg, script, [onerror]'), null);
  const serialized = decodeURIComponent(image.src.split(',').slice(1).join(','));
  assert.ok(serialized.includes('&lt;img'));
  renderCodeBlock('{}', element);
  assert.equal(element.childElementCount, 1);
  assert.equal(element.querySelector('img').alt, 'Fretzee diagram');
});

test('renderer errors stay local and recovery removes stale errors', () => {
  const invalid = document.createElement('div');
  const valid = document.createElement('div');
  renderCodeBlock('{"orientation":"<script>alert(1)</script>"}', invalid);
  assert.ok(invalid.classList.contains('fretzee-block-error'));
  assert.equal(invalid.querySelector('script'), null);
  assert.ok(invalid.querySelector('[role="alert"]').textContent.includes('Fretzee:'));
  renderCodeBlock('{}', valid);
  assert.ok(valid.querySelector('img'));
  renderCodeBlock('{}', invalid);
  assert.equal(invalid.classList.contains('fretzee-block-error'), false);
  assert.equal(invalid.querySelector('[role="alert"]'), null);
  assert.ok(invalid.querySelector('img'));
});

test('the starter block contains a renderable real configuration', () => {
  const source = EXAMPLE_BLOCK.replace(/^```fretzee\n/, '').replace(/\n```\n$/, '');
  assert.equal(renderDiagram(source).title, 'C major');
});

test('preserves the exact core SVG drawing and a single namespace declaration', () => {
  const config = { title: 'Root & third', orientation: 'vertical', stringCount: 4, fretCount: 5 };
  const expected = new Fretboard(config).render().outerHTML;
  const actual = renderDiagram(JSON.stringify(config)).svg;
  assert.equal(actual, expected);
  assert.equal((actual.match(/xmlns=/g) ?? []).length, 1);
});
