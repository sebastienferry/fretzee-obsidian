import obsidianmd from 'eslint-plugin-obsidianmd';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'main.js', 'scripts/**', 'tests/**', 'eslint.config.mjs', 'esbuild.config.mjs'] },
  ...obsidianmd.configs.recommended,
  { files: ['src/**/*.ts'], languageOptions: { parserOptions: { projectService: true } },
    rules: { 'obsidianmd/ui/sentence-case': ['warn', { brands: ['Fretzee', 'Guitar Pro', 'AlphaTab', 'Obsidian'] }] },
  },
];
