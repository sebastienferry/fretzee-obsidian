import { build } from 'esbuild';
import { licenseBanner } from './notices.mjs';
import { rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

try {
  await build({
    entryPoints: ['src/diagram.ts', 'src/main.ts', 'src/example.ts', 'src/tablature.ts', 'src/tablature-view.ts', 'src/tablature-picker.ts', 'src/sheet.ts', 'src/chords.ts', 'src/publishing.ts', 'src/publishing-protocol.ts', 'src/note-bundle.ts', 'src/root-note.ts'],
    loader: { '.woff2': 'dataurl' },
    external: ['node:crypto'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2021',
    outdir: '.test-build',
    outExtension: { '.js': '.mjs' },
    alias: { obsidian: resolve('tests/obsidian-stub.mjs') },
  });
  await build({
    entryPoints: ['src/main.ts'], banner: { js: await licenseBanner() }, bundle: true, format: 'cjs', platform: 'browser',
    target: 'es2021', external: ['obsidian'], outfile: '.test-build/main.cjs', minify: true,
    loader: { '.woff2': 'dataurl' },
  });
  const result = spawnSync(process.execPath, ['--import', './tests/dom-preload.mjs', '--test', 'tests/diagram.test.mjs', 'tests/plugin.test.mjs', 'tests/bundle.test.mjs', 'tests/tablature.test.mjs', 'tests/sheet.test.mjs', 'tests/chords.test.mjs', 'tests/publishing-protocol.test.mjs', 'tests/publishing.test.mjs', 'tests/note-bundle.test.mjs'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm('.test-build', { recursive: true, force: true });
}
