import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import FretzeePlugin from '../.test-build/main.mjs';
import { DocumentPublishing } from '../.test-build/publishing.mjs';
import { Plugin, Setting, TFile, TFolder, installHostDom, parseYaml, stringifyYaml } from './obsidian-stub.mjs';

let dom;
const token = 'fup_' + 'a'.repeat(32);
const origin = 'https://dev.fretzee.com';
const tick = () => new Promise(resolve => setTimeout(resolve, 30));
const command = (plugin, id) => plugin.commands.find(item => item.id === id);
const click = text => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === text); assert.ok(button, `Expected ${text}`); button.click(); };
function fixture() {
  const note = new TFile('Music/Cafe\u0301.md');
  const other = new TFile('Other/Private.md');
  const image = new TFile('Assets/image.png');
  const hidden = new TFile('.obsidian/private.json');
  const secrets = new Map([['fretzee-publish-vault',JSON.stringify({origin,token})]]);
  const files = new Map([note,other,image,hidden].map(file => [file.path.normalize('NFC'), file]));
  const bodies = new Map([[note.path, '# Café\n\n![Image](../Assets/image.png)\n\n[[Other/Private]]'], [other.path, '# Private']]);
  const originalBody = bodies.get(note.path);
  bodies.set(note.path, '---\nfretzee-type: document\n---\n' + originalBody);
  const originalText = bodies.get(note.path);
  const callbacks = new Map();
  const opened = [];
  dom.window.open = url => { opened.push(url); };
  globalThis.fretzeePluginData = { renderer: { keepColors:true }, publishing: {site:origin,vaultId:'vault',tokenOrigin:origin,extra:'preserved'} };
  globalThis.fretzeeTestApp = {
    workspace: { containerEl:document.body, getActiveFile:()=>note, on:(event,callback)=>{callbacks.set(event,callback);return {event};} },
    secretStorage: {getSecret:id=>secrets.get(id)||null,setSecret:(id,value)=>secrets.set(id,value)},
    vault: { getFiles:()=>[...files.values()], getName:()=> 'Vault', getFileByPath:path=>files.get(path), read: async file => bodies.get(file.path) || '', readBinary: async file => new TextEncoder().encode(bodies.get(file.path) || `ORIGINAL ${file.path}`).buffer },
    fileManager: {processFrontMatter: async (file, update) => { const text = bodies.get(file.path); const match = /^---\n([\s\S]*?)\n---\n/.exec(text); const metadata = match ? parseYaml(match[1]) : {}; update(metadata); bodies.set(file.path, '---\n' + stringifyYaml(metadata).trimEnd() + '\n---\n' + (match ? text.slice(match[0].length) : text)); }},
    metadataCache: {getFileCache:file=>({frontmatter:parseYaml(/^---\n([\s\S]*?)\n---\n/.exec(bodies.get(file.path)||'')?.[1]||'')||{},links:[{link:other.path}],embeds:[{link:image.path},{link:hidden.path}]}),getFirstLinkpathDest:(path, from) => files.get(path) || files.get(new URL(path, 'https://vault/' + from).pathname.slice(1))},
  };
  globalThis.fretzeeRequestUrl = async () => {const id='doc_'+'b'.repeat(32);return {status:201,json:{id,reviewPath:`/documents/${id}`}};};
  return {note,other,secrets,callbacks,opened,bodies,originalBody,originalText,files};
}
beforeEach(()=>{dom=new JSDOM('<!doctype html><body></body>',{url:'https://obsidian.test'});installHostDom(dom);globalThis.document=dom.window.document;globalThis.fretzeeNotices=[];globalThis.fretzeeRequests=[];globalThis.fretzeeDataWrites=[];});
afterEach(()=>{dom.window.close();for(const key of ['document','fretzeeTestApp','fretzeePluginData','fretzeeRequestUrl','fretzeeRequests','fretzeeDataWrites'])delete globalThis[key];});

test('the single plugin renders offline and registers optional sending without configuration writes',()=>{
  const plugin = new FretzeePlugin();plugin.onload();
  assert.deepEqual([...plugin.processors.keys()],['fretzee','fretzee_sheet','tablature','chords']);
  const element=document.createElement('div');plugin.processors.get('fretzee')('{"title":"Offline"}',element);
  assert.ok(element.querySelector('img'));
  assert.ok(command(plugin,'send-active-note'));
  assert.equal(command(plugin,'send-active-note').checkCallback(true),false);
  assert.equal(globalThis.fretzeeRequests.length,0);assert.equal(globalThis.fretzeeDataWrites.length,0);
  assert.equal(plugin.settingTabs.length,1);
  const definitions=plugin.settingTabs[0].getSettingDefinitions();
  assert.equal(definitions.length,3);assert.equal(globalThis.fretzeeDataWrites.length,0);
  plugin.onunload();
});
test('settings preserve renderer data and store credentials only in SecretStorage',async()=>{
  const {secrets}=fixture();const controller=new DocumentPublishing(new Plugin());
  await assert.rejects(controller.saveSite('https://user:secret@example.org'));
  await controller.saveSite('https://another.example');await controller.saveToken(token);
  assert.deepEqual(globalThis.fretzeePluginData.renderer,{keepColors:true});
  assert.equal(globalThis.fretzeePluginData.publishing.extra,'preserved');
  assert.ok(!JSON.stringify(globalThis.fretzeeDataWrites).includes(token));
  assert.deepEqual(JSON.parse(secrets.get('fretzee-publish-vault')),{origin:'https://another.example',token});
  await controller.forgetToken();assert.equal(secrets.get('fretzee-publish-vault'),'');
  assert.equal(globalThis.fretzeePluginData.publishing.tokenOrigin,'');
});
test('note confirmation precedes transport and canonical vault lookups preserve the source',async()=>{
  const {opened}=fixture();const plugin=new Plugin();const controller=new DocumentPublishing(plugin);controller.register();
  command(plugin,'send-active-note').checkCallback(false);await tick();
  assert.deepEqual(globalThis.fretzeeRequests,[]);
  for(let i=0;i<100&&!document.querySelector('li');i++)await new Promise(resolve=>setTimeout(resolve,5));
  const paths=[...document.querySelectorAll('li')].map(item=>item.textContent);
  assert.equal(paths.length, 1);assert.match(paths[0], /Music\/Cafe/);assert.match(paths[0], /Assets\/image.png/);
  click('Send private draft');await tick();
  assert.equal(globalThis.fretzeeRequests.length,1);
  const request=globalThis.fretzeeRequests[0];assert.equal(request.url,origin+'/api/v1/documents/import');
  assert.equal(request.headers.Authorization,'Bearer '+token);
  const upload=JSON.parse(request.body);
  assert.match(upload.sourceKey,/^note:[0-9a-f-]{36}$/);assert.equal(upload.entry,'note.md');
  assert.match(Buffer.from(upload.files.find(file=>file.path===upload.entry).content,'base64').toString(),/assets\/image.png/);
  assert.deepEqual(opened,[origin+'/documents/doc_'+'b'.repeat(32)]);
  assert.equal(document.querySelector('li'),null);controller.dispose();
});
test('folder context menu keeps folder scope and cancellation sends nothing',async()=>{
  const {callbacks}=fixture();const plugin=new Plugin();const controller=new DocumentPublishing(plugin);controller.register();
  let action;
  callbacks.get('file-menu')({addItem:callback=>{const item={setTitle:()=>item,setIcon:()=>item,onClick:callback=>{action=callback;return item;}};callback(item);}},new TFolder('Music'));
  assert.ok(action);action();await tick();
  assert.match(document.body.textContent,/Music\/Cafe/);
  click('Cancel');assert.deepEqual(globalThis.fretzeeRequests,[]);
  controller.dispose();
});
test('changing the destination or forgetting a token blocks an already prepared send',async()=>{
  const {note}=fixture();const controller=new DocumentPublishing(new Plugin());
  await controller.prepare(note);await controller.saveSite('https://another.example');click('Send private draft');await tick();
  assert.deepEqual(globalThis.fretzeeRequests,[]);assert.match(globalThis.fretzeeNotices.at(-1),/destination changed/);
  click('Cancel');await controller.saveSite(origin);await controller.prepare(note);await controller.forgetToken();click('Send private draft');await tick();
  assert.deepEqual(globalThis.fretzeeRequests,[]);controller.dispose();
});
test('duplicate preparation and unload cannot send an unconfirmed package',async()=>{
  const {note}=fixture();const controller=new DocumentPublishing(new Plugin());
  await controller.prepare(note);await controller.prepare(note);
  assert.equal(document.querySelectorAll('ul').length,1);
  assert.match(globalThis.fretzeeNotices.at(-1),/already being prepared/);
  controller.dispose();assert.equal(document.querySelector('ul'),null);assert.deepEqual(globalThis.fretzeeRequests,[]);
  await controller.prepare(note);assert.equal(document.querySelector('ul'),null);
});
test('searchable settings UI saves site and clears the token field after saving',async()=>{
  fixture();const plugin=new FretzeePlugin();plugin.onload();const tab=plugin.settingTabs[0];
  document.body.appendChild(tab.containerEl);const cleanups=tab.getSettingDefinitions().map(def=>def.render(new Setting(tab.containerEl).setName(def.name).setDesc(def.desc)));await tick();
  const siteInput=document.querySelector('input[type="text"],input:not([type])');
  assert.ok(siteInput);siteInput.value=origin;siteInput.dispatchEvent(new dom.window.Event('input'));
  click('Save site');await tick();
  const tokenInput=document.querySelector('input[type="password"]');tokenInput.value=token;tokenInput.dispatchEvent(new dom.window.Event('input'));
  click('Save token');await tick();assert.equal(tokenInput.value,'');
  assert.ok(!JSON.stringify(globalThis.fretzeePluginData).includes(token));
  assert.match(globalThis.fretzeeNotices.at(-1),/token saved/);for(const cleanup of cleanups)cleanup();plugin.onunload();
});

test('cancel leaves frontmatter untouched and confirmation records only per-origin acknowledgements',async()=>{
 const f=fixture();const controller=new DocumentPublishing(new Plugin());
 await controller.prepare(f.note);click('Cancel');assert.equal(f.bodies.get(f.note.path),f.originalText);
 await controller.prepare(f.note);click('Send private draft');await tick();
 const match=/id: ([a-f0-9-]+)/.exec(f.bodies.get(f.note.path));assert.ok(match);
 assert.ok(f.bodies.get(f.note.path).endsWith(f.originalBody));
 const state=globalThis.fretzeePluginData.publishing.sendState[origin][match[1]];
 assert.equal(state.documentId,'doc_'+'b'.repeat(32));assert.match(state.fingerprint,/^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(state).includes(token));controller.dispose();
});
test('changed dependencies require a fresh review before frontmatter writes or transport',async()=>{
 const f=fixture();const controller=new DocumentPublishing(new Plugin());await controller.prepare(f.note);
 f.bodies.set('Assets/image.png','CHANGED');click('Send private draft');await tick();
 assert.equal(globalThis.fretzeeRequests.length,0);assert.equal(f.bodies.get(f.note.path),f.originalText);
 assert.match(globalThis.fretzeeNotices.at(-1),/changed/);controller.dispose();
});
test('duplicate selected identities fail, while unrelated duplicate notes do not block sending',async()=>{
 const f=fixture();const id='12345678-1234-4234-8234-123456789abc';
 f.bodies.set(f.note.path,'---\nfretzee-type: document\nfretzee:\n  id: '+id+'\n---\n'+f.originalBody);
 f.bodies.set(f.other.path,'---\nfretzee:\n  id: '+id+'\n---\n# Other');
 const controller=new DocumentPublishing(new Plugin());await controller.prepare(f.note);
 assert.equal(document.querySelector('ul'),null);assert.match(globalThis.fretzeeNotices.at(-1),/Duplicate/);
 f.bodies.set(f.note.path,f.originalText);
 const copy=new TFile('Other/Copy.md');f.files.set(copy.path,copy);f.bodies.set(copy.path,f.bodies.get(f.other.path));
 await controller.prepare(f.note);assert.ok(document.querySelector('ul'));click('Cancel');controller.dispose();
});
test('failed container sends retain the main identity and can retry after explicit review',async()=>{
 const f=fixture();let fail=true;
 globalThis.fretzeeRequestUrl=async()=>fail?{status:503,json:{error:'Unavailable'}}:{status:201,json:{id:'doc_'+'b'.repeat(32),reviewPath:'/documents/doc_'+'b'.repeat(32)}};
 const controller=new DocumentPublishing(new Plugin());await controller.prepare(f.note);click('Send private draft');await tick();
 assert.match(f.bodies.get(f.note.path),/fretzee-id:/);assert.match(f.bodies.get(f.note.path),/fretzee-type: document/);
 const first=JSON.parse(globalThis.fretzeeRequests[0].body);assert.equal(first.schema,3);
 fail=false;click('Send private draft');await tick();
 const repeated=JSON.parse(globalThis.fretzeeRequests[1].body);assert.equal(first.sourceKey,repeated.sourceKey);
 assert.equal(Object.keys(globalThis.fretzeePluginData.publishing.sendState[origin]).length,1);controller.dispose();
});
test('sending lyrics selects the marked editorial note and includes Markdown as a resource',async()=>{
 const f=fixture();const lyrics=new TFile('Music/Lyrics.md');f.files.set(lyrics.path,lyrics);f.bodies.set(lyrics.path,'# Lyrics resource');
 const controller=new DocumentPublishing(new Plugin());await controller.prepare(lyrics);
 assert.match(document.querySelector('li').textContent,/Cafe/);assert.match(document.querySelector('li').textContent,/Lyrics.md/);
 click('Send private draft');await tick();
 const upload=JSON.parse(globalThis.fretzeeRequests[0].body);assert.equal(upload.schema,3);assert.equal(upload.title,'Café');
 assert.ok(upload.files.some(file=>file.path==='assets/Lyrics.md'));assert.equal(f.bodies.get(lyrics.path),'# Lyrics resource');controller.dispose();
});
test('missing main-note offer and outgoing confirmation can both be cancelled without metadata writes',async()=>{
 const f=fixture();f.bodies.set(f.note.path,f.originalBody);const controller=new DocumentPublishing(new Plugin());
 let pending=controller.prepare(f.note);await tick();assert.match(document.body.textContent,/No main note is defined/);click('Cancel');await pending;
 assert.equal(f.bodies.get(f.note.path),f.originalBody);assert.equal(globalThis.fretzeeRequests.length,0);
 pending=controller.prepare(f.note);await tick();click('Use as main note and review');await pending;
 assert.match(document.body.textContent,/flat fretzee-type/);click('Cancel');assert.equal(f.bodies.get(f.note.path),f.originalBody);
 pending=controller.prepare(f.note);await tick();click('Use as main note and review');await pending;click('Send private draft');await tick();
 assert.match(f.bodies.get(f.note.path),/fretzee-type: document/);assert.match(f.bodies.get(f.note.path),/fretzee-id:/);
 assert.ok(!f.bodies.get(f.note.path).includes('fretzee:\n'));controller.dispose();
});
