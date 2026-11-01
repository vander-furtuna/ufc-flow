import { randomUUID } from 'node:crypto'

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import { runMigrations } from '../../src/database/migrate'
import * as schema from '../../src/database/schema'

// Um PostgreSQL por arquivo de teste, com as migrations aplicadas
export async function startDatabase() {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:17-alpine',
  ).start()
  const url = container.getConnectionUri()
  await runMigrations(url)
  const pool = new pg.Pool({ connectionString: url })
  const db = drizzle(pool, { schema })
  return {
    url,
    db,
    async stop() {
      await pool.end()
      await container.stop()
    },
  }
}

export type TestDatabase = Awaited<ReturnType<typeof startDatabase>>

export async function insertCourse(
  db: TestDatabase['db'],
  overrides: Partial<typeof schema.courses.$inferInsert> = {},
) {
  const campusId = randomUUID()
  await db.insert(schema.campuses).values({
    id: campusId,
    slug: `campus-${campusId.slice(0, 8)}`,
    name: 'Campus da UFC em Sobral',
    city: 'Sobral',
    state: 'CE',
  })
  const course = {
    id: randomUUID(),
    sigaaId: String(Math.floor(Math.random() * 1e9)),
    slug: `curso-${randomUUID().slice(0, 8)}`,
    name: 'Engenharia de Computação',
    icon: 'cpu',
    campusId,
    ...overrides,
  }
  await db.insert(schema.courses).values(course)
  return course
}
