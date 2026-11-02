import { collectCodes, normalizeSearchText } from '@ufc-flow/academic-core'
import { Inject, Injectable } from '@nestjs/common'
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import {
  mapUnique,
  type Executor,
} from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import {
  auditLogs,
  userRoles,
  users,
} from '../../../identity/infrastructure/persistence/identity.schema'
import type { Course } from '../../domain/course'
import type { Branch, Curriculum } from '../../domain/curriculum'
import { CatalogErrors } from '../../domain/errors'
import type {
  CatalogRepositories,
  CatalogUnitOfWork,
  CurriculumImport,
  EnrollmentCounter,
} from '../../domain/ports'
import type { ReviewPoint } from '../../domain/review-points'
import { subjectSlug, type Subject } from '../../domain/subject'
import {
  branches,
  campuses,
  courses,
  curricula,
  curriculumImports,
  curriculumSubjectBranches,
  curriculumSubjectRequirements,
  curriculumSubjects,
  sigaaCourses,
  subjectEquivalenceCodes,
  subjectEquivalences,
  subjects,
} from './catalog.schema'

type CurriculumRow = typeof curricula.$inferSelect
type SubjectRow = typeof subjects.$inferSelect & {
  equivalences: Subject['equivalences']
}

const courseErrors = {
  courses_slug_unique: CatalogErrors.courseSlugTaken,
  courses_sigaa_id_unique: CatalogErrors.courseExists,
}

const toCourse = (row: typeof courses.$inferSelect): Course => ({
  id: row.id,
  sigaaId: row.sigaaId,
  slug: row.slug,
  name: row.name,
  icon: row.icon,
  color: row.color,
  campusId: row.campusId,
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

const toSubject = (row: SubjectRow): Subject => ({
  id: row.id,
  code: row.code,
  name: row.name,
  type: row.type,
  durationTerms: row.durationTerms === 2 ? 2 : 1,
  workloadHours: row.workloadHours,
  theoryHours: row.theoryHours,
  labHours: row.labHours,
  eadHours: row.eadHours,
  extensionHours: row.extensionHours,
  credits: row.credits,
  equivalences: row.equivalences,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

// Os pontos para revisar vão em JSONB; as datas voltam como texto
const reviveReviewPoints = (points: ReviewPoint[]): ReviewPoint[] =>
  points.map((point) => ({
    ...point,
    resolvedAt: point.resolvedAt ? new Date(point.resolvedAt) : null,
  })) as ReviewPoint[]

const toImport = (
  row: typeof curriculumImports.$inferSelect,
): CurriculumImport => ({
  id: row.id,
  courseId: row.courseId,
  courseSigaaId: row.courseSigaaId,
  curriculumId: row.curriculumId,
  source: row.source,
  payload: row.payload,
  status: row.status,
  reviewPoints: reviveReviewPoints(row.conflicts),
  importedBy: row.importedBy,
  createdAt: row.createdAt,
  appliedAt: row.appliedAt,
})

const importValues = (record: CurriculumImport) => ({
  id: record.id,
  courseId: record.courseId,
  courseSigaaId: record.courseSigaaId,
  curriculumId: record.curriculumId,
  schemaVersion: record.payload.schemaVersion,
  source: record.source,
  payload: record.payload,
  status: record.status,
  conflicts: record.reviewPoints,
  importedBy: record.importedBy,
  createdAt: record.createdAt,
  appliedAt: record.appliedAt,
})

const curriculumValues = (c: Curriculum) => ({
  id: c.id,
  courseId: c.courseId,
  ...c.header,
  status: c.status,
  isCurrent: c.isCurrent,
  needsReimport: c.needsReimport,
  publishedAt: c.publishedAt,
  publishedBy: c.publishedBy,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
})

function headerOf(row: CurriculumRow): Curriculum['header'] {
  return {
    code: row.code,
    effectiveTerm: row.effectiveTerm,
    slug: row.slug,
    sigaaId: row.sigaaId,
    matrixName: row.matrixName,
    unitName: row.unitName,
    minTotalHours: row.minTotalHours,
    maxTotalHours: row.maxTotalHours,
    mandatoryHours: row.mandatoryHours,
    optativeHours: row.optativeHours,
    extensionHours: row.extensionHours,
    specificActivityHours: row.specificActivityHours,
    maxFreeOptativeHours: row.maxFreeOptativeHours,
    minPeriods: row.minPeriods,
    avgPeriods: row.avgPeriods,
    maxPeriods: row.maxPeriods,
    periodMinHours: row.periodMinHours,
    periodAvgHours: row.periodAvgHours,
    periodMaxHours: row.periodMaxHours,
    minEmphases: row.minEmphases,
    maxEmphases: row.maxEmphases,
  }
}

// Mães antes das filhas
function byDepth(list: readonly Branch[]): Branch[] {
  const byId = new Map(list.map((branch) => [branch.id, branch]))
  const depth = (branch: Branch): number => {
    const parent = branch.parentId ? byId.get(branch.parentId) : undefined
    return parent ? depth(parent) + 1 : 0
  }
  return [...list].sort((a, b) => depth(a) - depth(b))
}

async function loadCurriculum(
  db: Executor,
  row: CurriculumRow | undefined,
): Promise<Curriculum | null> {
  if (!row) return null
  const branchRows = await db
    .select()
    .from(branches)
    .where(eq(branches.curriculumId, row.id))
    .orderBy(asc(branches.position))
  const subjectRows = await db
    .select({
      id: curriculumSubjects.id,
      subjectId: curriculumSubjects.subjectId,
      code: subjects.code,
      semester: curriculumSubjects.semester,
      nature: curriculumSubjects.nature,
      prerequisites: curriculumSubjects.prerequisiteExpr,
      corequisites: curriculumSubjects.corequisiteExpr,
    })
    .from(curriculumSubjects)
    .innerJoin(subjects, eq(subjects.id, curriculumSubjects.subjectId))
    .where(eq(curriculumSubjects.curriculumId, row.id))
    .orderBy(asc(curriculumSubjects.createdAt), asc(subjects.code))
  const ids = subjectRows.map((item) => item.id)
  const links =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(curriculumSubjectBranches)
          .where(inArray(curriculumSubjectBranches.curriculumSubjectId, ids))

  return {
    id: row.id,
    courseId: row.courseId,
    header: headerOf(row),
    status: row.status,
    isCurrent: row.isCurrent,
    needsReimport: row.needsReimport,
    publishedAt: row.publishedAt,
    publishedBy: row.publishedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    branches: branchRows.map(({ curriculumId: _, ...branch }) => branch),
    subjects: subjectRows.map((item) => ({
      ...item,
      branches: links
        .filter((link) => link.curriculumSubjectId === item.id)
        .map((link) => ({ branchId: link.branchId, nature: link.nature })),
    })),
  }
}

async function selectSubjects(db: Executor, where: SQL): Promise<Subject[]> {
  const rows = await db
    .select({ subject: subjects, equivalences: subjectEquivalences.expr })
    .from(subjects)
    .leftJoin(
      subjectEquivalences,
      eq(subjectEquivalences.subjectId, subjects.id),
    )
    .where(where)
  return rows.map((row) =>
    toSubject({ ...row.subject, equivalences: row.equivalences }),
  )
}

const subjectValues = (subject: Subject) => ({
  id: subject.id,
  code: subject.code,
  name: subject.name,
  slug: subjectSlug(subject.name),
  searchName: normalizeSearchText(subject.name),
  type: subject.type,
  workloadHours: subject.workloadHours,
  theoryHours: subject.theoryHours,
  labHours: subject.labHours,
  eadHours: subject.eadHours,
  extensionHours: subject.extensionHours,
  credits: subject.credits,
  durationTerms: subject.durationTerms,
  createdAt: subject.createdAt,
  updatedAt: subject.updatedAt,
})

// Equivalências e os códigos derivados delas
async function writeEquivalences(db: Executor, subject: Subject) {
  await db
    .delete(subjectEquivalences)
    .where(eq(subjectEquivalences.subjectId, subject.id))
  await db
    .delete(subjectEquivalenceCodes)
    .where(eq(subjectEquivalenceCodes.subjectId, subject.id))
  if (subject.equivalences === null) return
  await db
    .insert(subjectEquivalences)
    .values({ subjectId: subject.id, expr: subject.equivalences })
  const codes = [...new Set(collectCodes(subject.equivalences))]
  await db
    .insert(subjectEquivalenceCodes)
    .values(
      codes.map((code) => ({ subjectId: subject.id, equivalentCode: code })),
    )
  await db.execute(sql`
    UPDATE ${subjectEquivalenceCodes} AS e
    SET equivalent_subject_id = s.id
    FROM ${subjects} AS s
    WHERE s.code = e.equivalent_code AND e.subject_id = ${subject.id}
  `)
}

async function saveCurriculum(db: Executor, c: Curriculum) {
  const values = curriculumValues(c)
  await mapUnique(
    db
      .insert(curricula)
      .values(values)
      .onConflictDoUpdate({ target: curricula.id, set: values }),
    { curricula_course_slug: CatalogErrors.curriculumSlugTaken },
  )

  // Vertentes: some quem saiu do agregado (as filhas vão em cascata)
  const branchIds = c.branches.map((branch) => branch.id)
  await db
    .delete(branches)
    .where(
      branchIds.length === 0
        ? eq(branches.curriculumId, c.id)
        : and(
            eq(branches.curriculumId, c.id),
            notInArray(branches.id, branchIds),
          ),
    )
  for (const branch of byDepth(c.branches)) {
    const row = { ...branch, curriculumId: c.id }
    await db
      .insert(branches)
      .values(row)
      .onConflictDoUpdate({ target: branches.id, set: row })
  }

  const subjectIds = c.subjects.map((item) => item.id)
  await db
    .delete(curriculumSubjects)
    .where(
      subjectIds.length === 0
        ? eq(curriculumSubjects.curriculumId, c.id)
        : and(
            eq(curriculumSubjects.curriculumId, c.id),
            notInArray(curriculumSubjects.id, subjectIds),
          ),
    )
  if (c.subjects.length === 0) return

  const rows = c.subjects.map((item) => ({
    id: item.id,
    curriculumId: c.id,
    subjectId: item.subjectId,
    semester: item.semester,
    nature: item.nature,
    prerequisiteExpr: item.prerequisites,
    corequisiteExpr: item.corequisites,
  }))
  await db
    .insert(curriculumSubjects)
    .values(rows)
    .onConflictDoUpdate({
      target: curriculumSubjects.id,
      set: {
        semester: sql`excluded.semester`,
        nature: sql`excluded.nature`,
        prerequisiteExpr: sql`excluded.prerequisite_expr`,
        corequisiteExpr: sql`excluded.corequisite_expr`,
      },
    })

  // Vínculos e requisitos derivados são regravados por inteiro
  await db
    .delete(curriculumSubjectBranches)
    .where(inArray(curriculumSubjectBranches.curriculumSubjectId, subjectIds))
  const links = c.subjects.flatMap((item) =>
    item.branches.map((link) => ({
      curriculumSubjectId: item.id,
      branchId: link.branchId,
      nature: link.nature,
    })),
  )
  if (links.length > 0) await db.insert(curriculumSubjectBranches).values(links)

  await db
    .delete(curriculumSubjectRequirements)
    .where(
      inArray(curriculumSubjectRequirements.curriculumSubjectId, subjectIds),
    )
  const requirements = c.subjects.flatMap((item) => [
    ...[...new Set(collectCodes(item.prerequisites))].map((code) => ({
      curriculumSubjectId: item.id,
      kind: 'PRE' as const,
      requiredCode: code,
    })),
    ...[...new Set(collectCodes(item.corequisites))].map((code) => ({
      curriculumSubjectId: item.id,
      kind: 'CO' as const,
      requiredCode: code,
    })),
  ])
  if (requirements.length === 0) return
  await db.insert(curriculumSubjectRequirements).values(requirements)
  await db.execute(sql`
    UPDATE ${curriculumSubjectRequirements} AS r
    SET required_subject_id = s.id
    FROM ${subjects} AS s, ${curriculumSubjects} AS cs
    WHERE s.code = r.required_code
      AND cs.id = r.curriculum_subject_id
      AND cs.curriculum_id = ${c.id}
  `)
}

export function catalogRepositories(db: Executor): CatalogRepositories {
  return {
    sigaaCourses: {
      list: async () =>
        db.select().from(sigaaCourses).orderBy(asc(sigaaCourses.name)),
      find: async (sigaaId) => {
        const [row] = await db
          .select()
          .from(sigaaCourses)
          .where(eq(sigaaCourses.sigaaId, sigaaId))
        return row ?? null
      },
      sync: async (list, now) => {
        const known = new Set(
          (
            await db.select({ id: sigaaCourses.sigaaId }).from(sigaaCourses)
          ).map((row) => row.id),
        )
        if (list.length > 0) {
          await db
            .insert(sigaaCourses)
            .values(
              list.map((item) => ({
                ...item,
                firstSeenAt: now,
                lastSeenAt: now,
              })),
            )
            .onConflictDoUpdate({
              target: sigaaCourses.sigaaId,
              set: {
                name: sql`excluded.name`,
                city: sql`excluded.city`,
                modality: sql`excluded.modality`,
                unitAcronym: sql`excluded.unit_acronym`,
                unitName: sql`excluded.unit_name`,
                lastSeenAt: now,
                removedAt: null,
              },
            })
        }
        const seen = list.map((item) => item.sigaaId)
        const removed = await db
          .update(sigaaCourses)
          .set({ removedAt: now })
          .where(
            and(
              isNull(sigaaCourses.removedAt),
              seen.length === 0
                ? undefined
                : notInArray(sigaaCourses.sigaaId, seen),
            ),
          )
          .returning({ id: sigaaCourses.sigaaId })
        return {
          added: list.filter((item) => !known.has(item.sigaaId)).length,
          removed: removed.length,
        }
      },
    },
    campuses: {
      findById: async (id) => {
        const [row] = await db
          .select()
          .from(campuses)
          .where(eq(campuses.id, id))
        return row ?? null
      },
      findBySlug: async (slug) => {
        const [row] = await db
          .select()
          .from(campuses)
          .where(eq(campuses.slug, slug))
        return row ?? null
      },
      insert: async (campus) => {
        await db.insert(campuses).values(campus)
      },
    },
    courses: {
      findById: async (id) => {
        const [row] = await db.select().from(courses).where(eq(courses.id, id))
        return row ? toCourse(row) : null
      },
      findBySlug: async (slug) => {
        const [row] = await db
          .select()
          .from(courses)
          .where(eq(courses.slug, slug))
        return row ? toCourse(row) : null
      },
      findBySigaaId: async (sigaaId) => {
        const [row] = await db
          .select()
          .from(courses)
          .where(eq(courses.sigaaId, sigaaId))
        return row ? toCourse(row) : null
      },
      list: async () =>
        (await db.select().from(courses).orderBy(asc(courses.name))).map(
          toCourse,
        ),
      insert: async (course) => {
        await mapUnique(db.insert(courses).values(course), courseErrors)
      },
      update: async (course) => {
        await mapUnique(
          db.update(courses).set(course).where(eq(courses.id, course.id)),
          courseErrors,
        )
      },
      delete: async (id) => {
        await db.delete(courses).where(eq(courses.id, id))
      },
    },
    subjects: {
      findByCodes: async (codes) => {
        if (codes.length === 0) return new Map()
        const list = await selectSubjects(
          db,
          inArray(subjects.code, [...codes]),
        )
        return new Map(list.map((item) => [item.code, item]))
      },
      findByIds: async (ids) => {
        if (ids.length === 0) return new Map()
        const list = await selectSubjects(db, inArray(subjects.id, [...ids]))
        return new Map(list.map((item) => [item.id, item]))
      },
      insertMany: async (list) => {
        if (list.length === 0) return
        await mapUnique(db.insert(subjects).values(list.map(subjectValues)), {
          subjects_code_unique: () =>
            CatalogErrors.subjectCodeTaken(list[0]!.code),
        })
        for (const subject of list) {
          if (subject.equivalences !== null)
            await writeEquivalences(db, subject)
        }
      },
      update: async (subject) => {
        await mapUnique(
          db
            .update(subjects)
            .set(subjectValues(subject))
            .where(eq(subjects.id, subject.id)),
          {
            subjects_code_unique: () =>
              CatalogErrors.subjectCodeTaken(subject.code),
          },
        )
        await writeEquivalences(db, subject)
      },
      usedInPublished: async (subjectId) => {
        const [row] = await db
          .select({ id: curriculumSubjects.id })
          .from(curriculumSubjects)
          .innerJoin(
            curricula,
            eq(curricula.id, curriculumSubjects.curriculumId),
          )
          .where(
            and(
              eq(curriculumSubjects.subjectId, subjectId),
              eq(curricula.status, 'PUBLISHED'),
            ),
          )
          .limit(1)
        return row !== undefined
      },
    },
    curricula: {
      findById: async (id) => {
        const [row] = await db
          .select()
          .from(curricula)
          .where(eq(curricula.id, id))
        return loadCurriculum(db, row)
      },
      findBySlug: async (courseId, slug) => {
        const [row] = await db
          .select()
          .from(curricula)
          .where(
            and(eq(curricula.courseId, courseId), eq(curricula.slug, slug)),
          )
        return loadCurriculum(db, row)
      },
      findByCode: async (courseId, code) => {
        const [row] = await db
          .select()
          .from(curricula)
          .where(
            and(eq(curricula.courseId, courseId), eq(curricula.code, code)),
          )
        return loadCurriculum(db, row)
      },
      summaries: async (courseId) => {
        const rows = await db
          .select()
          .from(curricula)
          .where(eq(curricula.courseId, courseId))
          .orderBy(desc(curricula.effectiveTerm), desc(curricula.code))
        return rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          code: row.code,
          effectiveTerm: row.effectiveTerm,
          status: row.status,
          isCurrent: row.isCurrent,
          needsReimport: row.needsReimport,
          publishedAt: row.publishedAt?.toISOString() ?? null,
          updatedAt: row.updatedAt.toISOString(),
        }))
      },
      save: (c) => saveCurriculum(db, c),
      delete: async (id) => {
        await db.delete(curricula).where(eq(curricula.id, id))
      },
      // Primeiro desmarca, por causa do índice único parcial
      setCurrent: async (courseId, curriculumId) => {
        await db
          .update(curricula)
          .set({ isCurrent: false })
          .where(
            and(
              eq(curricula.courseId, courseId),
              eq(curricula.isCurrent, true),
            ),
          )
        await db
          .update(curricula)
          .set({ isCurrent: true })
          .where(eq(curricula.id, curriculumId))
      },
    },
    imports: {
      findById: async (id) => {
        const [row] = await db
          .select()
          .from(curriculumImports)
          .where(eq(curriculumImports.id, id))
        return row ? toImport(row) : null
      },
      insert: async (record) => {
        await db.insert(curriculumImports).values(importValues(record))
      },
      update: async (record) => {
        await db
          .update(curriculumImports)
          .set(importValues(record))
          .where(eq(curriculumImports.id, record.id))
      },
      list: async ({ status, visibleTo, before, limit }) => {
        const filters: (SQL | undefined)[] = [
          status ? eq(curriculumImports.status, status) : undefined,
          visibleTo
            ? or(
                eq(curriculumImports.importedBy, visibleTo.userId),
                visibleTo.courseIds.length > 0
                  ? inArray(curriculumImports.courseId, visibleTo.courseIds)
                  : undefined,
              )
            : undefined,
          before
            ? or(
                lt(curriculumImports.createdAt, before.createdAt),
                and(
                  eq(curriculumImports.createdAt, before.createdAt),
                  lt(curriculumImports.id, before.id),
                ),
              )
            : undefined,
        ]
        const rows = await db
          .select()
          .from(curriculumImports)
          .where(and(...filters))
          .orderBy(
            desc(curriculumImports.createdAt),
            desc(curriculumImports.id),
          )
          .limit(limit + 1)
        return rows.map(toImport)
      },
      pendingForCourse: async (sigaaId) =>
        (
          await db
            .select()
            .from(curriculumImports)
            .where(
              and(
                eq(curriculumImports.courseSigaaId, sigaaId),
                eq(curriculumImports.status, 'RECEIVED'),
                isNull(curriculumImports.courseId),
              ),
            )
            .orderBy(asc(curriculumImports.createdAt))
        ).map(toImport),
      latestApplied: async (curriculumId) => {
        const [row] = await db
          .select()
          .from(curriculumImports)
          .where(
            and(
              eq(curriculumImports.curriculumId, curriculumId),
              eq(curriculumImports.status, 'APPLIED'),
            ),
          )
          .orderBy(desc(curriculumImports.appliedAt))
          .limit(1)
        return row ? toImport(row) : null
      },
    },
    users: {
      isAdmin: async (userId) => {
        const [row] = await db
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(and(eq(userRoles.userId, userId), eq(userRoles.role, 'ADMIN')))
        return row !== undefined
      },
      names: async (ids) => {
        if (ids.length === 0) return new Map()
        const rows = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, [...ids]))
        return new Map(rows.map((row) => [row.id, row.name]))
      },
    },
    enrollments: noEnrollmentsYet,
    audit: {
      record: async (entry) => {
        await db.insert(auditLogs).values({ ...entry, module: 'catalog' })
      },
    },
  }
}

// As matrículas chegam na fase 9; até lá nenhuma EC tem matrícula
export const noEnrollmentsYet: EnrollmentCounter = {
  countForCurriculum: async () => 0,
}

@Injectable()
export class DrizzleCatalogUnitOfWork implements CatalogUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: CatalogRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(catalogRepositories(tx)))
  }
}
