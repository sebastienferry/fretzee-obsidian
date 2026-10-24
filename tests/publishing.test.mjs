import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import FretzeePlugin from '../.test-build/main.mjs';
import { DocumentPublishing } from '../.test-build/publishing.mjs';
import { Plugin, Setting, TFile, TFolder, installHostDom } from './obsidian-stub.mjs';

let dom;
const token = 'fup_' + 'a'.repeat(32);
const origin = 'https://dev.fretzee.com';
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const command = (plugin, id) => plugin.commands.find(item => item.id === id);
const click = text => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === text); assert.ok(button, `Expected ${text}`); button.click(); };
function fixture() {
  const note = new TFile('Music/Cafe\u0301.md');
  const other = new TFile('Other/Private.md');
  const image = new TFile('Assets/image.png');
  const hidden = new TFile('.obsidian/private.json');
  const secrets = new Map([['fretzee-publish-vault',JSON.stringify({origin,token})]]);
  const files = new Map([note,other,image,hidden].map(file => [file.path.normalize('NFC'), file]));
  const callbacks = new Map();
  const opened = [];
  dom.window.open = url => { opened.push(url); };
  globalThis.fretzeePluginData = { renderer: { keepColors:true }, publishing: {site:origin,vaultId:'vault',tokenOrigin:origin,extra:'preserved'} };
  globalThis.fretzeeTestApp = {
    workspace: { containerEl:document.body, getActiveFile:()=>note, on:(event,callback)=>{callbacks.set(event,callback);return {event};} },
    secretStorage: {getSecret:id=>secrets.get(id)||null,setSecret:(id,value)=>secrets.set(id,value)},
    vault: { getFiles:()=>[note,other,image,hidden], getName:()=> 'Vault', getFileByPath:path=>files.get(path), readBinary: async file => new TextEncoder().encode(`ORIGINAL ${file.path}`).buffer },
    metadataCache: {getFileCache:()=>({links:[{link:other.path}],embeds:[{link:image.path},{link:hidden.path}]}),getFirstLinkpathDest:path=>files.get(path)},
  };
  globalThis.fretzeeRequestUrl = async () => {const id='doc_'+'b'.repeat(32);return {status:201,json:{id,reviewPath:`/documents/${id}`}};};
  return {note,other,secrets,callbacks,opened};
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
  const {note,opened}=fixture();const plugin=new Plugin();const controller=new DocumentPublishing(plugin);controller.register();
  command(plugin,'send-active-note').checkCallback(false);await tick();
  assert.deepEqual(globalThis.fretzeeRequests,[]);
  const paths=[...document.querySelectorAll('li')].map(item=>item.textContent);
  assert.deepEqual(paths,['Assets/image.png','Music/Café.md']);
  click('Send private draft');await tick();
  assert.equal(globalThis.fretzeeRequests.length,1);
  const request=globalThis.fretzeeRequests[0];assert.equal(request.url,origin+'/api/v1/documents/import');
  assert.equal(request.headers.Authorization,'Bearer '+token);
  const upload=JSON.parse(request.body);
  assert.equal(upload.sourceKey,'vault:Music/Café.md');assert.equal(upload.entry,'Music/Café.md');
  assert.equal(Buffer.from(upload.files.find(file=>file.path===upload.entry).content,'base64').toString(),`ORIGINAL ${note.path}`);
  assert.deepEqual(opened,[origin+'/documents/doc_'+'b'.repeat(32)]);
  assert.equal(document.querySelector('li'),null);controller.dispose();
});
test('folder context menu keeps folder scope and cancellation sends nothing',async()=>{
  const {callbacks}=fixture();const plugin=new Plugin();const controller=new DocumentPublishing(plugin);controller.register();
  let action;
  callbacks.get('file-menu')({addItem:callback=>{const item={setTitle:()=>item,setIcon:()=>item,onClick:callback=>{action=callback;return item;}};callback(item);}},new TFolder('Music'));
  assert.ok(action);action();await tick();
  assert.ok(document.body.textContent.includes('Music/Café.md'));
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
