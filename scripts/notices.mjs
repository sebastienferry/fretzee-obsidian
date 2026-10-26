import { readFile, readdir } from 'node:fs/promises';

/** Keep all required notices in the three-file Community installation. */
export async function licenseBanner() {
  const files = ['LICENSE', 'THIRD_PARTY_NOTICES.md',
    'node_modules/@coderline/alphatab/LICENSE',
    'node_modules/@coderline/alphatab/dist/font/Bravura-OFL.txt'];
  const texts = await Promise.all(files.map(file => readFile(file, 'utf8')));
  return `/*!\n${[...texts, await markdownNotices()].join('\n\n').replaceAll('*/', '* /')}\n*/`;
}

/** Include exact MIT notices for the locked production Markdown dependency graph. */
export async function markdownNotices() {
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const packages = Object.entries(lock.packages).filter(([path, item]) => path && !item.dev && !['node_modules/fretzee', 'node_modules/@coderline/alphatab'].includes(path));
  const notices = [];
  for (const [path] of packages.sort(([a], [b]) => a.localeCompare(b))) {
    const metadata = JSON.parse(await readFile(`${path}/package.json`, 'utf8'));
    if (metadata.license !== 'MIT') throw new Error(`Review the license for ${metadata.name}.`);
    const license = (await readdir(path)).find(name => /^licen[cs]e(?:\.md|\.txt)?$/iu.test(name));
    if (!license) throw new Error(`Missing license for ${metadata.name}.`);
    notices.push(`${metadata.name} ${metadata.version}\n${await readFile(`${path}/${license}`, 'utf8')}`);
  }
  return notices.join('\n\n');
}
