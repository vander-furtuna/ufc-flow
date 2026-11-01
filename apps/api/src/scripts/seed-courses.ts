import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import {
  campuses,
  courses,
} from '../modules/catalog/infrastructure/persistence/catalog.schema'

// Leva os cursos do apps/web/src/data/courses.ts para o banco (fase 4, para
// os pedidos de moderação). Idempotente: atualiza pelo código do SIGAA. As
// ECs entram na fase 5.
//   pnpm --filter @ufc-flow/api seed:courses

type SeedCourse = {
  id: string
  name: string
  slug: string
  icon: string
  color?: string
  isActive?: boolean
}

type SigaaCourse = { sigaaId: string; unitAcronym: string | null }

// Campi das unidades dos cursos atuais. A fase 5 traz o catálogo completo
// (sigaa_courses, D34).
const CAMPUSES: Record<string, typeof campuses.$inferInsert> = {
  CUFCSOBRAL: {
    id: randomUUID(),
    slug: 'sobral',
    name: 'Campus da UFC em Sobral',
    city: 'Sobral',
    state: 'CE',
  },
}

const root = new URL('../../../../', import.meta.url)
const { COURSES_DATA } = (await import(
  pathToFileURL(fileURLToPath(new URL('apps/web/src/data/courses.ts', root)))
    .href
)) as { COURSES_DATA: SeedCourse[] }
const sigaa = JSON.parse(
  readFileSync(
    new URL('apps/extension/src/sigaa/catalog/sigaa-courses.json', root),
    'utf8',
  ),
) as SigaaCourse[]

const url = process.env.DATABASE_URL
if (!url) throw new Error('Defina DATABASE_URL (veja apps/api/.env.example)')
const pool = new pg.Pool({ connectionString: url })
const db = drizzle(pool)

try {
  await db.transaction(async (tx) => {
    const campusIds = new Map<string, string>()
    for (const [unit, campus] of Object.entries(CAMPUSES)) {
      const [row] = await tx
        .insert(campuses)
        .values(campus)
        .onConflictDoUpdate({
          target: campuses.slug,
          set: { name: campus.name, city: campus.city, state: campus.state },
        })
        .returning({ id: campuses.id })
      campusIds.set(unit, row!.id)
    }

    for (const course of COURSES_DATA) {
      const unit = sigaa.find((item) => item.sigaaId === course.id)?.unitAcronym
      const campusId = unit ? campusIds.get(unit) : undefined
      if (!campusId) {
        throw new Error(
          `Sem campus para o curso ${course.name} (${course.id}); acrescente a unidade ${unit} em CAMPUSES`,
        )
      }
      const values = {
        name: course.name,
        slug: course.slug,
        icon: course.icon,
        color: course.color ?? null,
        campusId,
        isActive: course.isActive ?? true,
      }
      await tx
        .insert(courses)
        .values({ id: randomUUID(), sigaaId: course.id, ...values })
        .onConflictDoUpdate({
          target: courses.sigaaId,
          set: { ...values, updatedAt: sql`now()` },
        })
    }
  })
  console.log(`${COURSES_DATA.length} cursos no banco`)
} finally {
  await pool.end()
}
