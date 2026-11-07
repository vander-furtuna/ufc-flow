import { defineConfig } from 'tsup'

// Build de produção: um bundle ESM para o Node. Os pacotes do workspace
// exportam TypeScript e entram no bundle; as dependências do npm ficam de fora.
// Além da API, os comandos que a imagem Docker roda: migrate (a cada subida)
// e os seeds do primeiro deploy.
export default defineConfig({
  entry: process.env.TSUP_ENTRY
    ? [process.env.TSUP_ENTRY]
    : {
        main: 'src/main.ts',
        migrate: 'src/scripts/migrate.ts',
        'seed-admin': 'src/scripts/seed-admin.ts',
        'seed-catalog': 'src/scripts/seed-catalog.ts',
      },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@ufc-flow\//],
})
