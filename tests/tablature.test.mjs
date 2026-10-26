import { installHostDom } from './obsidian-stub.mjs';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { importer, exporter } from '@coderline/alphatab';
import { TFile } from './obsidian-stub.mjs';
import { loadVaultScore, parseBars, parseExcerptConfiguration, renderExcerpt, validateSelection, MAX_FILE_SIZE, excerptBlock } from '../.test-build/tablature.mjs';
import { TablatureView } from '../.test-build/tablature-view.mjs';
import { TablaturePicker } from '../.test-build/tablature-picker.mjs';
import FretzeePlugin from '../.test-build/main.mjs';

const source = importer.ScoreLoader.loadAlphaTex('\\title "Fixture" . \\track "Lead" :4 1.1 2.1 3.1 4.1 | 5.1 6.1 7.1 8.1 \\track "Bass" \\tuning G2 D2 A1 E1 :4 15.1 15.1 15.1 15.1 | 17.1 17.1 17.1 17.1');
const bytes = new exporter.Gp7Exporter().export(source);
const configuration = { file: 'raw/Tablatures/Exercise.gp', track: 2, bars: '2-2', profile: 'tab' };
let dom;
beforeEach(() => {
  dom = new JSDOM('<!doctype html><body></body>'); installHostDom(dom);
  globalThis.document = dom.window.document;
  globalThis.fretzeeNotices = [];
});
afterEach(() => { dom.window.close(); delete globalThis.document; delete globalThis.fretzeeTestApp; });

function vaultApp() {
  const file = new TFile(configuration.file, bytes.length);
  const handlers = new Map();
  let read = async () => bytes.slice().buffer;
  let exists = true;
  const app = { vault: {
    getFiles: () => exists ? [file] : [],
    getAbstractFileByPath: path => exists && path === file.path ? file : null,
    readBinary: item => { assert.equal(item, file); return read(); },
    on: (event, handler) => {
      const listeners = handlers.get(event) ?? new Set(); handlers.set(event, listeners); listeners.add(handler);
      return { off: () => listeners.delete(handler) };
    },
  } };
  return { app, file, handlers, setRead: value => { read = value; }, setExists: value => { exists = value; },
    emit: (event, ...args) => handlers.get(event)?.forEach(handler => handler(...args)) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('parses exact vault paths, one-based tracks, inclusive ranges and notation', () => {
  assert.deepEqual(parseExcerptConfiguration(JSON.stringify(configuration)), configuration);
  assert.deepEqual(parseBars('3'), { start: 3, end: 3 });
  assert.deepEqual(parseBars(' 3 - 8 '), { start: 3, end: 8 });
  const minimal = parseExcerptConfiguration('{"file":"Répertoire/My song.gp5","bars":"1-2"}');
  assert.equal(minimal.track, 1); assert.equal(minimal.profile, 'tab');
});

test('rejects non-vault paths, invalid selections and oversized configurations', () => {
  for (const file of ['/tmp/x.gp', 'https://example.com/x.gp', 'file:///x.gp', 'C:\\x.gp', 'a//x.gp', 'a//x.gp']) {
    assert.throws(() => parseExcerptConfiguration(JSON.stringify({ ...configuration, file })), /path/);
  }
  for (const bars of ['0-2', '2-1', '-1', '1-129', '1.2-3', '1-2oops', '1e2']) assert.throws(() => parseBars(bars));
  for (const extra of [{ track: 0 }, { track: '1' }, { bars: 2 }, { profile: 'unknown' }]) {
    assert.throws(() => parseExcerptConfiguration(JSON.stringify({ ...configuration, ...extra })));
  }
  assert.throws(() => parseExcerptConfiguration(' '.repeat(16385)), /large/);
});

test('reads a real Guitar Pro file through the vault API and renders only the selected track and measure', async () => {
  const { app } = vaultApp();
  const score = await loadVaultScore(app, configuration.file);
  assert.equal(score.tracks.length, 2); assert.equal(score.masterBars.length, 2);
  const chunks = renderExcerpt(score, configuration, 800);
  const docs = chunks.map(xml => new dom.window.DOMParser().parseFromString(xml, 'image/svg+xml'));
  docs.forEach(doc => assert.equal(doc.documentElement.localName, 'svg'));
  const text = docs.map(doc => doc.documentElement.textContent).join(' ');
  const notes = docs.flatMap(doc => [...doc.querySelectorAll('text')].map(node => node.textContent.trim()));
  assert.ok(notes.includes('17'), 'Selected Bass measure is present');
  assert.equal(notes.includes('15'), false, 'Previous Bass measure is absent');
  assert.equal(notes.includes('5'), false, 'Other track is absent');
  assert.ok(text.includes('data:font/woff2;base64,'));
  assert.ok(text.includes('FretzeeBravura'));
});

test('supports score and combined notation and rejects out-of-score selections', async () => {
  const { app } = vaultApp(); const score = await loadVaultScore(app, configuration.file);
  for (const profile of ['score', 'default']) assert.ok(renderExcerpt(score, { ...configuration, profile }, 800).length);
  assert.throws(() => validateSelection(score, { ...configuration, track: 3 }), /Track/);
  assert.throws(() => validateSelection(score, { ...configuration, bars: '1-3' }), /2 measures/);
});

test('missing, oversized and corrupt vault files fail without fallback', async () => {
  const vault = vaultApp();
  await assert.rejects(loadVaultScore(vault.app, 'missing.gp'), /not found/);
  vault.file.stat.size = MAX_FILE_SIZE + 1;
  await assert.rejects(loadVaultScore(vault.app, configuration.file), /20 MiB/);
  vault.file.stat.size = 3; vault.setRead(async () => new Uint8Array([1, 2, 3]).buffer);
  await assert.rejects(loadVaultScore(vault.app, configuration.file), /Unable to read/);
  vault.file.extension = 'md';
  await assert.rejects(loadVaultScore(vault.app, configuration.file), /Choose a Guitar Pro/);
});

test('render children display the excerpt, refresh on changes, report deletion and clean listeners', async () => {
  const vault = vaultApp(); const element = document.createElement('div');
  const child = new TablatureView(element, vault.app, JSON.stringify(configuration));
  child.load(); await tick();
  assert.ok(element.querySelector('img'));
  assert.equal(element.querySelector('svg, script'), null);
  vault.setExists(false); vault.emit('delete', vault.file); await tick();
  assert.ok(element.textContent.includes('not found'));
  vault.setExists(true); vault.emit('modify', vault.file); await tick();
  assert.ok(element.querySelector('img'));
  child.unload();
  assert.ok([...vault.handlers.values()].every(handlers => handlers.size === 0));
});

test('a pending read cannot render after unload', async () => {
  const vault = vaultApp(); let finish;
  vault.setRead(() => new Promise(resolve => { finish = resolve; }));
  const element = document.createElement('div');
  const child = new TablatureView(element, vault.app, JSON.stringify(configuration));
  child.load(); child.unload(); finish(bytes.slice().buffer); await tick();
  assert.equal(element.querySelector('img'), null);
});

test('picker loads real tracks, inserts the chosen measure range and reports success', async () => {
  const { app } = vaultApp(); let inserted;
  const picker = new TablaturePicker(app, block => { inserted = block; }); picker.open();
  const [file, track, profile] = picker.contentEl.querySelectorAll('select');
  file.value = configuration.file; file.dispatchEvent(new dom.window.Event('change')); await tick();
  assert.equal(track.options.length, 2); track.value = '2'; profile.value = 'tab';
  const [first, last] = picker.contentEl.querySelectorAll('input'); first.value = '2'; last.value = '2';
  picker.contentEl.querySelector('form').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  const config = parseExcerptConfiguration(inserted.replace(/^```tablature\n/, '').replace(/\n```\n$/, ''));
  assert.deepEqual(config, configuration);
  assert.deepEqual(globalThis.fretzeeNotices, ['Guitar Pro excerpt inserted.']);
});

test('picker cancel leaves the note untouched and invalid ranges keep the picker open', async () => {
  const { app } = vaultApp(); let inserted = false;
  const picker = new TablaturePicker(app, () => { inserted = true; }); picker.open();
  const file = picker.contentEl.querySelector('select'); file.value = configuration.file;
  file.dispatchEvent(new dom.window.Event('change')); await tick();
  const [first, last] = picker.contentEl.querySelectorAll('input'); first.value = '2'; last.value = '1';
  picker.contentEl.querySelector('form').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  assert.equal(inserted, false); assert.ok(picker.contentEl.isConnected);
  assert.ok(picker.contentEl.querySelector('[role="status"]').textContent.includes('Measures'));
  picker.contentEl.querySelector('button[type="button"]').click(); assert.equal(inserted, false);
});

test('the registered tablature processor owns its render child through the host context', async () => {
  const { app } = vaultApp(); globalThis.fretzeeTestApp = app;
  const plugin = new FretzeePlugin(); plugin.onload();
  const element = document.createElement('div'); let child;
  plugin.processors.get('tablature')(JSON.stringify(configuration), element, { addChild: value => { child = value; child.load(); } });
  await tick(); assert.ok(element.querySelector('img')); child.unload();
});


test('a stale successful read cannot replace a newer missing-file error', async () => {
  const vault = vaultApp(); let finish;
  vault.setRead(() => new Promise(resolve => { finish = resolve; }));
  const element = document.createElement('div');
  const child = new TablatureView(element, vault.app, JSON.stringify(configuration));
  child.load();
  vault.setExists(false); vault.emit('delete', vault.file); await tick();
  finish(bytes.slice().buffer); await tick();
  assert.ok(element.textContent.includes('not found'));
  assert.equal(element.querySelector('img'), null); child.unload();
});


test('loads an NFD-accented path from an NFC-indexed vault without changing the source reference', async () => {
  const vault = vaultApp();
  vault.file.path = 'raw/Répertoire/Exercise.gp';
  const reference = vault.file.path.normalize('NFD');
  assert.notEqual(reference, vault.file.path);
  const config = parseExcerptConfiguration(JSON.stringify({ ...configuration, file: reference }));
  assert.equal(config.file, vault.file.path);
  const score = await loadVaultScore(vault.app, reference);
  assert.equal(score.tracks.length, 2);
  assert.equal(reference.normalize('NFC'), vault.file.path);
});

test('refreshes a decomposed-accent reference when canonical vault events arrive', async () => {
  const vault = vaultApp(); vault.file.path = 'raw/Répertoire/Exercise.gp';
  const reference = vault.file.path.normalize('NFD');
  const element = document.createElement('div');
  const child = new TablatureView(element, vault.app, JSON.stringify({ ...configuration, file: reference }));
  child.load(); await tick();
  assert.ok(element.querySelector('img'), element.textContent);
  vault.setExists(false); vault.emit('delete', vault.file); await tick();
  assert.ok(element.textContent.includes('not found'));
  vault.setExists(true); vault.emit('modify', vault.file); await tick();
  assert.ok(element.querySelector('img'), element.textContent); child.unload();
});


test('serialized excerpts use canonical paths and direct loads retain vault path validation', async () => {
  const vault = vaultApp(); const path = 'raw/Répertoire/Exercise.gp';
  const block = excerptBlock({ ...configuration, file: path.normalize('NFD') });
  const config = JSON.parse(block.replace(/^```tablature\n/, '').replace(/\n```\n$/, ''));
  assert.equal(config.file, path);
  for (const invalid of ['../Exercise.gp', '/Exercise.gp', 'file:///Exercise.gp']) {
    await assert.rejects(loadVaultScore(vault.app, invalid), /relative to the vault/);
  }
});

test('accepts JSON and flat presentation options including the original key/value example', () => {
  const expected = { ...configuration, title: 'Intro', zoom: 0.7, minimal: true };
  assert.deepEqual(parseExcerptConfiguration(JSON.stringify(expected)), expected);
  const flat = `file: ${configuration.file}\ntrack: 2\nbars: 2-2\nprofile: tab\ntitle: Intro\nminimal: true\nzoom: 0.7`;
  assert.deepEqual(parseExcerptConfiguration(flat), expected);
  assert.deepEqual(parseExcerptConfiguration(excerptBlock(expected).slice('```tablature\n'.length, -5)), expected);
  const single = parseExcerptConfiguration("file: 'raw/Player''s Exercise.gp'\nbars: 1\nminimal: false\nzoom: 1");
  assert.equal(single.file, "raw/Player's Exercise.gp"); assert.equal(single.bars, '1'); assert.equal(single.minimal, false);
});

test('rejects invalid presentation values and unsupported flat syntax before reading the vault', () => {
  for (const extra of [{ zoom: 0 }, { zoom: -1 }, { zoom: 0.24 }, { zoom: 3.01 }, { zoom: '0.7' },
    { zoom: null }, { minimal: 'true' }, { minimal: 1 }, { title: '' }, { title: 7 }, { title: 'x'.repeat(201) }]) {
    assert.throws(() => parseExcerptConfiguration(JSON.stringify({ ...configuration, ...extra })));
  }
  for (const suffix of ['zoom: 1e999', 'minimal: yes', 'zoom: 0.7\nzoom: 1', 'unknown: true', 'title: &alias', 'title: [nested]']) {
    assert.throws(() => parseExcerptConfiguration(`file: raw/song.gp\nbars: 1-4\n${suffix}`));
  }
  for (const zoom of [0.25, 3]) assert.equal(parseExcerptConfiguration(JSON.stringify({ ...configuration, zoom })).zoom, zoom);
});

test('minimal hides score headers while preserving the selected notes and normal mode stays unchanged', async () => {
  const { app } = vaultApp(); const score = await loadVaultScore(app, configuration.file);
  score.title = 'Visible score header'; score.artist = 'Visible artist header';
  const text = chunks => chunks.map(xml => new dom.window.DOMParser().parseFromString(xml, 'image/svg+xml').documentElement.textContent).join(' ');
  const full = text(renderExcerpt(score, configuration, 800));
  const minimal = text(renderExcerpt(score, { ...configuration, minimal: true }, 800));
  assert.ok(full.includes(score.title)); assert.ok(full.includes(score.artist));
  assert.equal(minimal.includes(score.title), false); assert.equal(minimal.includes(score.artist), false);
  assert.ok(minimal.includes('17')); assert.equal(score.title, 'Visible score header');
  assert.equal(text(renderExcerpt(score, { ...configuration, minimal: false }, 800)), full);
});

test('zoom changes actual SVG notation size and a safe explicit title survives minimal rendering', async () => {
  const { app } = vaultApp(); const score = await loadVaultScore(app, configuration.file);
  const height = zoom => renderExcerpt(score, { ...configuration, minimal: true, zoom }, 800)
    .map(xml => parseFloat(new dom.window.DOMParser().parseFromString(xml, 'image/svg+xml').documentElement.getAttribute('height')))
    .reduce((sum, value) => sum + value, 0);
  assert.ok(height(0.7) < height(1)); assert.ok(height(1.5) > height(1));
  const element = document.createElement('div');
  const child = new TablatureView(element, app, `file: ${configuration.file}\ntrack: 2\nbars: 2-2\ntitle: <img src=x onerror=alert(1)>\nminimal: true\nzoom: 0.7`);
  await child.refresh();
  assert.equal(element.querySelector('h3').textContent, '<img src=x onerror=alert(1)>');
  assert.ok(element.querySelectorAll('img').length > 0); assert.equal(element.querySelector('img[onerror],script'), null);
  child.unload();
});


test('explicit notation profiles preserve imported staff visibility and musical content', async () => {
  const { app } = vaultApp(); const score = await loadVaultScore(app, configuration.file);
  const before = score.tracks.map(track => track.staves.map(staff => [staff.showTablature, staff.showStandardNotation, staff.showSlash, staff.showNumbered]));
  for (const profile of ['tab', 'score', 'default']) {
    assert.ok(renderExcerpt(score, { ...configuration, profile }, 800).length);
    assert.deepEqual(score.tracks.map(track => track.staves.map(staff => [staff.showTablature, staff.showStandardNotation, staff.showSlash, staff.showNumbered])), before);
  }
});

test('note-relative Guitar Pro references resolve through the vault and render the selected excerpt',async()=>{
 const vault=vaultApp();vault.app.metadataCache={getFirstLinkpathDest:(reference,sourcePath)=>reference==='../../Tablatures/Exercise.gp'&&sourcePath==='raw/Notes/Folder/Note.md'?vault.file:null};
 const score=await loadVaultScore(vault.app,'../../Tablatures/Exercise.gp','raw/Notes/Folder/Note.md');
 assert.ok(renderExcerpt(score,{...configuration,file:'../../Tablatures/Exercise.gp'},800).length);
 await assert.rejects(loadVaultScore(vault.app,'../../../../secret.gp','raw/Note.md'),/escapes/);
});
