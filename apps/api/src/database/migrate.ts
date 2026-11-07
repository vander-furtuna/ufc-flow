import { fileURLToPath } from 'node:url'

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

// apps/api/drizzle, a partir de src/. Na imagem Docker, o bundle fica em
// dist/ e a pasta vem de MIGRATIONS_DIR.
const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url))

export async function runMigrations(
  connectionString: string,
  migrationsFolder = process.env.MIGRATIONS_DIR ?? MIGRATIONS,
) {
  const pool = new pg.Pool({ connectionString, max: 1 })
  try {
    await migrate(drizzle(pool), { migrationsFolder })
  } finally {
    await pool.end()
  }
}
