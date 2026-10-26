import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import { JSDOM } from 'jsdom';
import { posix } from 'node:path';
import { installHostDom } from './obsidian-stub.mjs';
import { resolveMainNote } from '../.test-build/root-note.mjs';
import { prepareNote, noteMetadata } from '../.test-build/note-bundle.mjs';
const id='12345678-1234-4234-8234-123456789abc';
let dom;
beforeEach(()=>{dom=new JSDOM('');installHostDom(dom);globalThis.document=dom.window.document;});
afterEach(()=>{dom.window.close();delete globalThis.document;});
function fixture(text, paths=['Assets/image.png','Scores/song.gp']) {
 const note={path:'raw/Notes/Music.md',name:'Music.md',basename:'Music',extension:'md'};
 const files=[note,...paths.map(path=>({path,name:posix.basename(path),basename:posix.basename(path,posix.extname(path)),extension:posix.extname(path).slice(1)}))];
 const reads=[];
 const source={files:()=>files,text:async()=>text,read:async file=>{reads.push(file.path);return new TextEncoder().encode(file.path).buffer;},cachedId:()=>undefined,
 resolve:(ref,from)=>files.find(file=>file.path===ref)||files.find(file=>file.path===posix.normalize(posix.join(posix.dirname(from.path),ref)))||null};
 return {note,files,source,reads};
}
const body=prepared=>Buffer.from(prepared.upload.files.find(file=>file.path==='note.md').content,'base64').toString();
test('exports only direct dependencies and rewrites Markdown/wiki/tablature paths in the copy',async()=>{
 const original='---\ntitle: My note\ntags: [music]\n---\n# Music\n![Photo](../../Assets/image.png)\n![[Assets/image.png|Cover]]\n[PDF][download]\n\n[download]: Assets/guide.pdf\n\n```tablature\nfile: Scores/song.gp\nbars: 1-2\n```\n\n```md\n![[Secret.png]]\n```\n`![[Secret.png]]`\n[[Other note]]';
 const {source,note,reads}=fixture(original,['Assets/image.png','Scores/song.gp','Assets/guide.pdf','Other note.md']);
 const prepared=await prepareNote(source,note,id);
 assert.equal(prepared.upload.schema,2);assert.equal(prepared.upload.sourceKey,'note:'+id);assert.equal(prepared.upload.entry,'note.md');
 assert.deepEqual(prepared.upload.files.map(file=>file.path).sort(),['assets/guide.pdf','assets/image.png','assets/song.gp','note.md']);
 const exported=body(prepared);
 assert.match(exported,/!\[Photo\]\(assets\/image.png\)/);assert.match(exported,/!\[\[assets\/image.png\|Cover\]\]/);
 assert.match(exported,/\[download\]: assets\/guide.pdf/);assert.match(exported,/"file": "assets\/song.gp"/);
 assert.match(exported,/!\[\[Secret.png\]\]/);assert.match(exported,/\[\[Other note\]\]/);
 assert.equal(reads.includes('Other note.md'),false);assert.equal(await source.text(note),original);
 assert.equal(noteMetadata(exported).id,id);assert.deepEqual(noteMetadata(exported).metadata.tags,['music']);
});
test('renaming or moving retains publication identity and portable entry',async()=>{
 const {source,note}=fixture('---\nfretzee:\n  id: '+id+'\n---\n# Body');
 const first=await prepareNote(source,note,id);
 note.path='Elsewhere/Renamed.md';note.name='Renamed.md';note.basename='Renamed';
 const second=await prepareNote(source,note,id);
 assert.equal(first.upload.sourceKey,second.upload.sourceKey);assert.equal(second.upload.entry,'note.md');assert.equal(second.upload.title,'Renamed');
});
test('same-named dependencies are distinct and each physical asset is read once',async()=>{
 const {source,note,reads}=fixture('![[A/cover.png]] ![[B/cover.png]] ![[A/cover.png]]',['A/cover.png','B/cover.png']);
 const prepared=await prepareNote(source,note,id);
 assert.equal(prepared.upload.files.length,3);assert.equal(new Set(prepared.upload.files.map(file=>file.path)).size,3);assert.equal(reads.length,2);
 assert.match(body(prepared),/assets\/cover-[a-f0-9]{12}.png/);
});
test('remote images are not read and hidden or missing dependencies fail before transport',async()=>{
 const {source,note,reads}=fixture('![Remote](https://example.org/picture.png)');
 await prepareNote(source,note,id);assert.deepEqual(reads,[]);
 for(const reference of ['Missing.png','.obsidian/private.png']){
  const f=fixture('![image]('+reference+')',[reference==='.obsidian/private.png'?reference:'Assets/image.png']);
  await assert.rejects(prepareNote(f.source,f.note,id));
 }
});
test('normal code, escaped wiki syntax and unrelated source metadata remain literal',async()=>{
 const original='---\nother: true\nfretzee:\n  id: '+id+'\n  extra: keep\n---\n\\![[Missing.png]]\n`![missing](Missing.png)`\n\n```js\n![[Missing.png]]\n```';
 const f=fixture(original);const prepared=await prepareNote(f.source,f.note,id);
 assert.equal(noteMetadata(body(prepared)).metadata.fretzee.extra,'keep');assert.equal(await f.source.text(f.note),original);assert.equal(prepared.dependencies.length,0);
});
test('invalid identities and scalar metadata are rejected without overwriting them',()=>{
 for(const value of ['---\nfretzee: keep\n---\nBody','---\nfretzee:\n  id: invalid\n---\nBody'])assert.throws(()=>noteMetadata(value));
});


test('explicit folder roots retain flat legacy identity and attach other Markdown with relative references',async()=>{
 const rootText='---\nfretzee:\n  id: '+id+'\n  keep: true\nfretzee-type: document\n---\n# Editorial\n[[Lyrics]]';
 const f=fixture(rootText,['raw/Notes/Lyrics.md','raw/Notes/cover.png']);
 const texts=new Map([[f.note.path,rootText],['raw/Notes/Lyrics.md','# Lyrics\n![Cover](cover.png)\n[[Music]]']]);
 f.source.text=async file=>texts.get(file.path)||'';
 f.source.read=async file=>new TextEncoder().encode(texts.get(file.path)||'image').buffer;
 f.source.resolve=(ref,from)=>f.files.find(file=>file.path===ref||file.path===posix.join(posix.dirname(from.path),ref)||file.path===posix.join(posix.dirname(from.path),ref+'.md'))||null;
 const prepared=await prepareNote(f.source,f.note,id,true);assert.equal(prepared.upload.schema,3);
 assert.equal(noteMetadata(body(prepared)).metadata['fretzee-id'],id);assert.equal(noteMetadata(body(prepared)).metadata.fretzee.keep,true);assert.equal(noteMetadata(body(prepared)).metadata.fretzee.id,undefined);
 const lyrics=Buffer.from(prepared.upload.files.find(file=>file.path==='assets/Lyrics.md').content,'base64').toString();
 assert.match(lyrics,/!\[Cover\]\(cover.png\)/);assert.match(lyrics,/\[\[..\/note.md\]\]/);
 assert.match(body(prepared),/assets\/Lyrics.md/);assert.equal(await f.source.text(f.note),rootText);
 const selection=await resolveMainNote(f.source,'raw/Notes/Lyrics.md',false);assert.equal(selection.main.path,f.note.path);
});
test('multiple marked main notes fail instead of selecting an arbitrary editorial document',async()=>{
 const f=fixture('---\nfretzee-type: document\n---\n# Main',['raw/Notes/Other.md']);
 f.source.text=async()=> '---\nfretzee-type: document\n---\n# Main';
 await assert.rejects(resolveMainNote(f.source,f.note.path,false),/Multiple/);
 await assert.rejects(prepareNote(f.source,f.note,id,true),/Multiple/);
 assert.throws(()=>noteMetadata('---\nfretzee-id: '+id+'\nfretzee:\n  id: 11111111-1111-4111-8111-111111111111\n---\nBody'),/Conflicting/);
});


test('HX and Helix presets are exported byte-for-byte as directory resources with portable links',async()=>{
 const original='---\nfretzee-type: document\n---\n# Song\n[Preset](sound.hlx)';
 const f=fixture(original,['raw/Notes/sound.hlx','raw/Notes/backup.HX']);
 const contents=new Map([['raw/Notes/sound.hlx',new TextEncoder().encode('{"meta":{"name":"Clean"}}')],['raw/Notes/backup.HX',Uint8Array.from([0,255,128,42])]]);
 f.source.read=async file=>contents.get(file.path).buffer;
 const prepared=await prepareNote(f.source,f.note,id,true);
 for(const [path,bytes] of contents){
  const exported=prepared.upload.files.find(file=>file.path==='assets/'+posix.basename(path));
  assert.ok(exported);assert.deepEqual(Buffer.from(exported.content,'base64'),Buffer.from(bytes));
 }
 assert.match(body(prepared),/\[Preset\]\(assets\/sound.hlx\)/);
 assert.equal(await f.source.text(f.note),original);
});
test('legacy direct dependencies include HX presets and unavailable preset links fail explicitly',async()=>{
 const f=fixture('[Preset](../../Assets/sound.hlx)',['Assets/sound.hlx']);
 const prepared=await prepareNote(f.source,f.note,id);
 assert.ok(prepared.upload.files.some(file=>file.path==='assets/sound.hlx'));
 const missing=fixture('[Preset](Missing.hx)');
 await assert.rejects(prepareNote(missing.source,missing.note,id,true),/Referenced attachment is unavailable: Missing.hx/);
});


test('directory resources accept arbitrary extensions and extensionless files without changing bytes',async()=>{
 const original='---\nfretzee-type: document\n---\n# Main\n[Archive](backup.zip) [Custom](tone.vendorpreset) [File](LICENSE)';
 const paths=['raw/Notes/backup.zip','raw/Notes/tone.vendorpreset','raw/Notes/LICENSE','raw/Notes/page.html'];
 const f=fixture(original,paths);const bytes=Uint8Array.from([0,255,128,42]);
 f.source.read=async()=>bytes.buffer;
 const prepared=await prepareNote(f.source,f.note,id,true);
 assert.equal(prepared.dependencies.length,paths.length);
 for(const path of paths){const exported=prepared.upload.files.find(file=>file.path==='assets/'+posix.basename(path));assert.ok(exported);assert.deepEqual(Buffer.from(exported.content,'base64'),Buffer.from(bytes));}
 assert.match(body(prepared),/assets\/backup.zip/);assert.match(body(prepared),/assets\/tone.vendorpreset/);assert.match(body(prepared),/assets\/LICENSE/);
 assert.equal(await f.source.text(f.note),original);
});
test('direct dependencies have no file-type allowlist and missing explicit filenames fail',async()=>{
 const f=fixture('[Preset](../../Assets/tone.vendorpreset) [File](../../Assets/LICENSE)',['Assets/tone.vendorpreset','Assets/LICENSE']);
 const prepared=await prepareNote(f.source,f.note,id);
 assert.deepEqual(prepared.dependencies.map(item=>item.path).sort(),['assets/LICENSE','assets/tone.vendorpreset']);
 const missing=fixture('[File](missing.vendorpreset)');
 await assert.rejects(prepareNote(missing.source,missing.note,id),/Referenced attachment is unavailable/);
});
