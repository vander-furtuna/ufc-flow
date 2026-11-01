import { fileURLToPath } from 'node:url'

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

// apps/api/drizzle, tanto rodando de src/ quanto do bundle em dist/
const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url))

export async function runMigrations(connectionString: string) {
  const pool = new pg.Pool({ connectionString, max: 1 })
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS })
  } finally {
    await pool.end()
  }
}
