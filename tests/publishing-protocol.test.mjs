import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIMITS,
  base64,
  prepareUpload,
  safePath,
  sendDraft,
  siteOrigin,
  storedToken
} from "../.test-build/publishing-protocol.mjs";
const note = (path) => ({
  path,
  name: path.split("/").at(-1),
  basename: path.split("/").at(-1).replace(/\.[^.]+$/u, ""),
  extension: path.split(".").at(-1)
});
const token = "fup_" + "a".repeat(32);
const source = (files, attachments = []) => ({
  files: () => files,
  attachments: () => attachments,
  read: async (file) => new TextEncoder().encode(`ORIGINAL ${file.path}`).buffer
});
test("note sends preserve exact bytes and do not traverse linked notes or hidden attachments", async () => {
  const input = source(
    [note("Music/Note.md"), note("Other/Secret.md")],
    [
      note("Assets/Picture.png"),
      note("Other/Secret.md"),
      note(".obsidian/private.json")
    ]
  );
  const upload = await prepareUpload(
    input,
    { path: "Music/Note.md", title: "Note", folder: false },
    "vault"
  );
  assert.deepEqual(
    upload.files.map((file) => file.path),
    ["Assets/Picture.png", "Music/Note.md"]
  );
  assert.equal(
    Buffer.from(upload.files[1].content, "base64").toString(),
    "ORIGINAL Music/Note.md"
  );
  assert.equal(upload.entry, "Music/Note.md");
  assert.equal(upload.sourceKey, "vault:Music/Note.md");
});
test("folder scope has a boundary and chooses its entry document", async () => {
  const upload = await prepareUpload(
    source([
      note("Music/Other.md"),
      note("Music/index.md"),
      note("Music/Assets/Picture.png"),
      note("Musical/Private.md"),
      note("Music/.secret.md")
    ]),
    { path: "Music", title: "Music", folder: true },
    "vault"
  );
  assert.equal(upload.entry, "Music/index.md");
  assert.equal(upload.files.length, 3);
});
test("dangerous paths and insecure endpoints are rejected", () => {
  for (const path of [
    "../private.md",
    "/absolute.md",
    ".obsidian/config.json",
    "Music/../Note.md",
    "C:\\Note.md",
    "Music//Note.md",
    "Music/\0.md"
  ])
    assert.throws(() => safePath(path));
  assert.equal(safePath("Cafe\u0301/Note.md"), "Caf\xE9/Note.md");
  for (const site of [
    "http://example.com",
    "https://user:secret@example.com",
    "https://example.com/path",
    "https://example.com/?token=secret",
    "file:///vault"
  ])
    assert.throws(() => siteOrigin(site));
  assert.equal(siteOrigin("http://127.0.0.1:8081"), "http://127.0.0.1:8081");
});
test("the origin binding is kept inside SecretStorage, not trusted synced settings", () => {
  const credential = JSON.stringify({
    origin: "https://dev.fretzee.com",
    token
  });
  assert.equal(storedToken(credential, "https://dev.fretzee.com"), token);
  assert.throws(() => storedToken(credential, "https://attacker.example"));
  assert.throws(() => storedToken(null, "https://dev.fretzee.com"));
});
test("oversized packages fail before transport", async () => {
  const input = source([note("Note.md")]);
  input.read = async () => new ArrayBuffer(LIMITS.fileBytes + 1);
  await assert.rejects(
    prepareUpload(
      input,
      { path: "Note.md", title: "Note", folder: false },
      "vault"
    )
  );
  const files = Array.from(
    { length: 201 },
    (_, index) => note(`Note${index}.md`)
  );
  await assert.rejects(
    prepareUpload(
      source(files),
      { path: "/", title: "Vault", folder: true },
      "vault"
    )
  );
});
test("sending calls only the draft import endpoint with the scoped credential", async () => {
  const upload = await prepareUpload(
    source([note("Note.md")]),
    { path: "Note.md", title: "Note", folder: false },
    "vault"
  );
  let requests = 0;
  const id = "doc_" + "b".repeat(32);
  const result = await sendDraft(
    "https://dev.fretzee.com",
    token,
    upload,
    async (request) => {
      requests++;
      assert.equal(
        request.url,
        "https://dev.fretzee.com/api/v1/documents/import"
      );
      assert.equal(request.method, "POST");
      assert.equal(request.headers.Authorization, `Bearer ${token}`);
      assert.deepEqual(JSON.parse(request.body), upload);
      assert.ok(!request.body.includes(token));
      return { status: 201, json: { id, reviewPath: `/documents/${id}` } };
    }
  );
  assert.equal(requests, 1);
  assert.equal(result.id, id);
  await assert.rejects(
    sendDraft("https://dev.fretzee.com", token, upload, async () => ({
      status: 201,
      json: { id, reviewPath: "https://attacker.example" }
    }))
  );
});
test("binary base64 conversion preserves every byte", () => {
  const data = Uint8Array.from({ length: 7e4 }, (_, index) => index % 256);
  assert.deepEqual(
    Buffer.from(base64(data.buffer), "base64"),
    Buffer.from(data)
  );
});

test('a trashed main identity reports that restoration is required',async()=>{
 await assert.rejects(sendDraft('https://dev.fretzee.com','fup_'+'a'.repeat(32),{schema:3,sourceKey:'note:12345678-1234-4234-8234-123456789abc',title:'Main',entry:'note.md',files:[]},async()=>({status:409,json:{}})),/Restore it in My Collection/);
});


test('legacy folder and direct attachment exports accept arbitrary types and extensionless files',async()=>{
 const files=[note('Music/Note.md'),note('Music/backup.zip'),{path:'Music/LICENSE',name:'LICENSE',basename:'LICENSE',extension:''}];
 const folder=await prepareUpload(source(files),{path:'Music',title:'Music',folder:true},'vault');
 assert.deepEqual(folder.files.map(file=>file.path).sort(),['Music/LICENSE','Music/Note.md','Music/backup.zip']);
 const direct=await prepareUpload(source([files[0]],[note('Assets/tone.vendorpreset'),files[2]]),{path:'Music/Note.md',title:'Note',folder:false},'vault');
 assert.ok(direct.files.some(file=>file.path==='Assets/tone.vendorpreset'));assert.ok(direct.files.some(file=>file.path==='Music/LICENSE'));
});
