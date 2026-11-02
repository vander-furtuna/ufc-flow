import { readFileSync } from 'node:fs'

import type { SigaaCourse } from '@ufc-flow/academic-core'
import type { CurriculumImportV1 } from '@ufc-flow/contracts'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from '../database/schema'
import { CreateCourseUseCase } from '../modules/catalog/application/courses.use-cases'
import { CurriculumEditor } from '../modules/catalog/application/curriculum-editor'
import {
  GetManagedCurriculumUseCase,
  MarkCurrentCurriculumUseCase,
  PublishCurriculumUseCase,
  UpdateCurriculumUseCase,
} from '../modules/catalog/application/curriculum-editing.use-cases'
import { ImportApplier } from '../modules/catalog/application/import-applier'
import {
  CreateImportUseCase,
  ResolveReviewPointUseCase,
} from '../modules/catalog/application/ingestion.use-cases'
import { DrizzleCatalogUnitOfWork } from '../modules/catalog/infrastructure/persistence/drizzle-catalog'
import type { Actor } from '../shared/domain/access-policy'
import { RandomIdGenerator } from '../shared/infrastructure/random-id-generator'
import { SystemClock } from '../shared/infrastructure/system-clock'
import { legacyToImport, loadLegacyCourses } from './legacy-courses'

// Leva os 6 cursos e as 9 ECs do apps/web/src/data/courses.ts para o banco
// pelo mesmo pipeline da extensão (importar, resolver pontos, publicar).
// Eng. de Computação 2006.2 usa a fixture real do SIGAA, com os OU; as
// demais ficam marcadas para reimportação. Idempotente: pula o que existe.
// Rode depois do seed:admin.
//   pnpm --filter @ufc-flow/api seed:catalog

const root = new URL('../../../../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')

// Catálogo do SIGAA embutido na extensão, para não depender da internet
const sigaaCatalog = JSON.parse(
  read('apps/extension/src/sigaa/catalog/sigaa-courses.json'),
) as SigaaCourse[]
const realFixture = JSON.parse(
  read('packages/contracts/fixtures/engenharia-de-computacao-2006-2.json'),
) as CurriculumImportV1

const url = process.env.DATABASE_URL
if (!url) throw new Error('Defina DATABASE_URL (veja apps/api/.env.example)')
const pool = new pg.Pool({ connectionString: url })
const db = drizzle(pool, { schema })

try {
  const [adminRow] = await db
    .select({ id: schema.userRoles.userId })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.role, 'ADMIN'))
    .limit(1)
  if (!adminRow) {
    throw new Error('Nenhum admin no banco: rode o seed:admin antes')
  }
  const admin: Actor = {
    userId: adminRow.id,
    isAdmin: true,
    moderatedCourseIds: new Set(),
    enrolledCourseIds: new Set(),
  }

  const now = new Date()
  await db
    .insert(schema.sigaaCourses)
    .values(
      sigaaCatalog.map((item) => ({
        ...item,
        firstSeenAt: now,
        lastSeenAt: now,
      })),
    )
    .onConflictDoNothing()

  const uow = new DrizzleCatalogUnitOfWork(db)
  const clock = new SystemClock()
  const ids = new RandomIdGenerator()
  const applier = new ImportApplier(clock, ids)
  const editor = new CurriculumEditor(uow, clock, ids)
  const createCourse = new CreateCourseUseCase(uow, clock, ids, applier)
  const createImport = new CreateImportUseCase(uow, clock, ids, applier)
  const resolve = new ResolveReviewPointUseCase(editor)
  const getManaged = new GetManagedCurriculumUseCase(editor)
  const publish = new PublishCurriculumUseCase(editor)
  const markCurrent = new MarkCurrentCurriculumUseCase(editor)
  const updateCurriculum = new UpdateCurriculumUseCase(editor)

  let created = 0
  for (const course of await loadLegacyCourses()) {
    const sigaa = sigaaCatalog.find((item) => item.sigaaId === course.id)
    const [existing] = await db
      .select({ id: schema.courses.id })
      .from(schema.courses)
      .where(eq(schema.courses.sigaaId, course.id))
    const courseId =
      existing?.id ??
      (
        await createCourse.execute(admin, {
          sigaaId: course.id,
          slug: course.slug,
          name: course.name,
          icon: course.icon,
          color: course.color ?? null,
        })
      ).id

    // Sem EC marcada no front, a única EC do curso é a vigente
    const flagged = course.curriculumStructures.some((item) => item.isCurrent)
    for (const curriculum of course.curriculumStructures) {
      const [present] = await db
        .select({ id: schema.curricula.id })
        .from(schema.curricula)
        .where(
          and(
            eq(schema.curricula.courseId, courseId),
            eq(schema.curricula.code, curriculum.period),
          ),
        )
      if (present) continue

      const isReal =
        course.id === realFixture.course.sigaaId &&
        curriculum.period === realFixture.curriculum.code
      const payload = isReal
        ? realFixture
        : legacyToImport(course, curriculum, sigaa ?? null, now.toISOString())
      const view = await createImport.execute(admin, payload, 'UPLOAD')
      const id = view.curriculum.id as string

      // Divergências entre ECs do próprio courses.ts: fica o que já está no
      // catálogo; requisitos fora dele ficam como texto
      const managed = await getManaged.execute(admin, id)
      for (const point of managed.reviewPoints) {
        const resolution =
          point.type === 'UNKNOWN_REQUIREMENT_CODE'
            ? 'ACKNOWLEDGED'
            : point.type === 'EQUIVALENCES_SUGGESTED'
              ? 'APPLY'
              : 'KEEP_CATALOG'
        await resolve.execute(admin, view.id, point.key, resolution)
      }
      // As URLs de hoje não mudam: o slug do front vale, mesmo quando não
      // bate com o código (Ciências Econômicas 2025.1 está em /2005-1)
      if (managed.header.slug !== curriculum.slug) {
        await updateCurriculum.execute(admin, id, { slug: curriculum.slug })
      }
      await publish.execute(admin, id)
      if (
        curriculum.isCurrent ||
        (!flagged && course.curriculumStructures.length === 1)
      ) {
        await markCurrent.execute(admin, id)
      }
      if (!isReal) {
        await db
          .update(schema.curricula)
          .set({ needsReimport: true })
          .where(eq(schema.curricula.id, id))
      }
      created++
      console.log(`${course.name} ${curriculum.period}: publicada`)
    }
  }
  console.log(`${created} estruturas criadas`)
} finally {
  await pool.end()
}
