import { defineConfig } from 'drizzle-kit'

// Migrations geradas com `pnpm --filter @ufc-flow/api db:generate` e
// revisadas à mão. Nunca edite uma migration já mesclada na develop.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://ufcflow:ufcflow@localhost:5432/ufcflow',
  },
  strict: true,
})
