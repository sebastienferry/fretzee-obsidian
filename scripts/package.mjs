import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { markdownNotices } from './notices.mjs';
import { execFileSync } from 'node:child_process';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (manifest.version !== pkg.version) throw new Error('Package and manifest versions must match.');
const destination = `dist/${manifest.id}`;
await mkdir('dist', { recursive: true });
await rm(destination, { recursive: true, force: true });
await mkdir(destination);
for (const file of ['main.js', 'manifest.json', 'styles.css', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md']) {
  await cp(file, `${destination}/${file}`);
}
await mkdir(`${destination}/licenses`);
await writeFile(`${destination}/licenses/Markdown-MIT.txt`, await markdownNotices());
await cp('node_modules/@coderline/alphatab/LICENSE', `${destination}/licenses/AlphaTab-MPL-2.0.txt`);
const alphaTabSource = await readFile('node_modules/@coderline/alphatab/dist/alphaTab.core.mjs', 'utf8');
const notices = alphaTabSource.slice(0, alphaTabSource.indexOf('*/') + 2);
await writeFile(`${destination}/licenses/AlphaTab-integrated-libraries.txt`, `${notices}\n`);
await cp('node_modules/@coderline/alphatab/dist/font/Bravura-OFL.txt', `${destination}/licenses/Bravura-OFL.txt`);
const archive = `fretzee-${manifest.version}.zip`;
await rm(`dist/${archive}`, { force: true });
execFileSync('zip', ['-qr', archive, manifest.id], { cwd: 'dist', stdio: 'inherit' });
console.log(`Plugin folder: ${destination}\nInstallable archive: dist/${archive}`);
