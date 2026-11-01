import { defineConfig } from 'tsup'

// Build de produção: um bundle ESM para o Node. Os pacotes do workspace
// exportam TypeScript e entram no bundle; as dependências do npm ficam de fora.
export default defineConfig({
  entry: process.env.TSUP_ENTRY ? [process.env.TSUP_ENTRY] : ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@ufc-flow\//],
})
