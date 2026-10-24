import { build, context } from 'esbuild';
import { licenseBanner } from './scripts/notices.mjs';

const watch = process.argv.includes('--watch');
const options = {
  entryPoints: ['src/main.ts'],
  banner: { js: await licenseBanner() },
  bundle: true,
  loader: { '.woff2': 'dataurl' },
  external: ['obsidian'],
  format: 'cjs',
  platform: 'browser',
  target: 'es2021',
  outfile: 'main.js',
  sourcemap: watch ? 'inline' : false,
  minify: !watch,
  logLevel: 'info',
};

if (watch) {
  const builder = await context(options);
  await builder.watch();
} else {
  await build(options);
}
