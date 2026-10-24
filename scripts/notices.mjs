import { readFile } from 'node:fs/promises';

/** Keep all required notices in the three-file Community installation. */
export async function licenseBanner() {
  const files = ['LICENSE', 'THIRD_PARTY_NOTICES.md',
    'node_modules/@coderline/alphatab/LICENSE',
    'node_modules/@coderline/alphatab/dist/font/Bravura-OFL.txt'];
  const texts = await Promise.all(files.map(file => readFile(file, 'utf8')));
  return `/*!\n${texts.join('\n\n').replaceAll('*/', '* /')}\n*/`;
}
