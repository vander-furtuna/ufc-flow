import { Inject, Injectable } from '@nestjs/common'
import {
  collectCodes,
  type ProgressBranchType,
  type RequirementExpr,
} from '@ufc-flow/academic-core'
import { and, asc, desc, eq, inArray, isNotNull, notInArray } from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import type { Executor } from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import {
  branches,
  courses,
  curricula,
  curriculumSubjectBranches,
  curriculumSubjects,
  subjectEquivalences,
  subjects,
} from '../../../catalog/infrastructure/persistence/catalog.schema'
import { academicTerms } from '../../../classes/infrastructure/persistence/classes.schema'
import { fileAttachmentRepository } from '../../../files/infrastructure/persistence/drizzle-files'
import { auditLogs } from '../../../identity/infrastructure/persistence/identity.schema'
import type { Activity, ActivityCategory } from '../../domain/activity'
import type { StoredRecord } from '../../domain/academic-record'
import type { Enrollment } from '../../domain/enrollment'
import type {
  AcademicCatalog,
  AcademicRecordRepositories,
  AcademicRecordUnitOfWork,
  CurriculumSnapshot,
} from '../../domain/ports'
import {
  activityCategories,
  studentActivityRecords,
  studentEnrollments,
  studentSubjectRecords,
} from './academic-record.schema'

type RecordRow = typeof studentSubjectRecords.$inferSelect

const subjectInfo = {
  id: subjects.id,
  code: subjects.code,
  name: subjects.name,
  workloadHours: subjects.workloadHours,
  extensionHours: subjects.extensionHours,
}

const toRecord = (row: RecordRow & { subjectCode: string }): StoredRecord => ({
  id: row.id,
  enrollmentId: row.enrollmentId,
  subjectId: row.subjectId,
  subjectCode: row.subjectCode,
  term: row.termCode,
  status: row.status,
  grade: row.grade,
  sourceRecordId: row.sourceRecordId,
  originNote: row.originNote,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

const recordColumns = (record: StoredRecord) => ({
  id: record.id,
  enrollmentId: record.enrollmentId,
  subjectId: record.subjectId,
  termCode: record.term,
  status: record.status,
  grade: record.grade,
  sourceRecordId: record.sourceRecordId,
  originNote: record.originNote,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
})

function catalogReader(db: Executor): AcademicCatalog {
  const curriculumInfo = {
    id: curricula.id,
    courseId: curricula.courseId,
    slug: curricula.slug,
    code: curricula.code,
    status: curricula.status,
  }
  const toCurriculum = (
    row: { status: string } & Record<
      'id' | 'courseId' | 'slug' | 'code',
      string
    >,
  ) => ({
    id: row.id,
    courseId: row.courseId,
    slug: row.slug,
    code: row.code,
    published: row.status === 'PUBLISHED',
  })
  const courseInfo = {
    id: courses.id,
    slug: courses.slug,
    name: courses.name,
    isActive: courses.isActive,
  }

  return {
    async findCourse(slug) {
      const [row] = await db
        .select(courseInfo)
        .from(courses)
        .where(eq(courses.slug, slug))
      return row ?? null
    },
    async findCourseById(id) {
      const [row] = await db
        .select(courseInfo)
        .from(courses)
        .where(eq(courses.id, id))
      return row ?? null
    },
    async findCurriculum(courseId, slug) {
      const [row] = await db
        .select(curriculumInfo)
        .from(curricula)
        .where(and(eq(curricula.courseId, courseId), eq(curricula.slug, slug)))
      return row ? toCurriculum(row) : null
    },
    async findCurriculumById(id) {
      const [row] = await db
        .select(curriculumInfo)
        .from(curricula)
        .where(eq(curricula.id, id))
      return row ? toCurriculum(row) : null
    },
    async subjectsByCodes(codes) {
      if (codes.length === 0) return []
      return db
        .select(subjectInfo)
        .from(subjects)
        .where(inArray(subjects.code, [...codes]))
    },
    async subjectsByIds(ids) {
      if (ids.length === 0) return []
      return db
        .select(subjectInfo)
        .from(subjects)
        .where(inArray(subjects.id, [...ids]))
    },
    async currentTerm() {
      const [row] = await db
        .select({ code: academicTerms.code, endsAt: academicTerms.endsAt })
        .from(academicTerms)
        .where(eq(academicTerms.isCurrent, true))
      return row ?? null
    },
    async snapshot(curriculumId): Promise<CurriculumSnapshot> {
      const [curriculum] = await db
        .select()
        .from(curricula)
        .where(eq(curricula.id, curriculumId))
      const items = await db
        .select({
          id: curriculumSubjects.id,
          code: subjects.code,
          name: subjects.name,
          type: subjects.type,
          semester: curriculumSubjects.semester,
          nature: curriculumSubjects.nature,
          workloadHours: subjects.workloadHours,
          extensionHours: subjects.extensionHours,
          prerequisite: curriculumSubjects.prerequisiteExpr,
          corequisite: curriculumSubjects.corequisiteExpr,
        })
        .from(curriculumSubjects)
        .innerJoin(subjects, eq(subjects.id, curriculumSubjects.subjectId))
        .where(eq(curriculumSubjects.curriculumId, curriculumId))
        .orderBy(asc(subjects.code))
      const links = items.length
        ? await db
            .select({
              curriculumSubjectId:
                curriculumSubjectBranches.curriculumSubjectId,
              branchId: curriculumSubjectBranches.branchId,
            })
            .from(curriculumSubjectBranches)
            .where(
              inArray(
                curriculumSubjectBranches.curriculumSubjectId,
                items.map((item) => item.id),
              ),
            )
        : []
      const branchRows = await db
        .select()
        .from(branches)
        .where(eq(branches.curriculumId, curriculumId))
        .orderBy(asc(branches.position))

      // Equivalências das disciplinas da EC e das citadas nos requisitos
      const codes = new Set(items.map((item) => item.code))
      for (const item of items) {
        for (const code of collectCodes(item.prerequisite)) codes.add(code)
        for (const code of collectCodes(item.corequisite)) codes.add(code)
      }
      const equivalences = codes.size
        ? await db
            .select({ code: subjects.code, expr: subjectEquivalences.expr })
            .from(subjectEquivalences)
            .innerJoin(subjects, eq(subjects.id, subjectEquivalences.subjectId))
            .where(inArray(subjects.code, [...codes]))
        : []

      return {
        mandatoryHours: curriculum!.mandatoryHours,
        optativeHours: curriculum!.optativeHours,
        maxFreeOptativeHours: curriculum!.maxFreeOptativeHours,
        extensionHours: curriculum!.extensionHours,
        minTotalHours: curriculum!.minTotalHours,
        minEmphases: curriculum!.minEmphases,
        maxEmphases: curriculum!.maxEmphases,
        // Zero quando a EC não informa o ritmo
        periodAvgHours: curriculum!.periodAvgHours || null,
        subjects: items.map(({ id, prerequisite, corequisite, ...item }) => ({
          ...item,
          branchIds: links
            .filter((link) => link.curriculumSubjectId === id)
            .map((link) => link.branchId),
          prerequisite: prerequisite ?? null,
          corequisite: corequisite ?? null,
        })),
        branches: branchRows.map((branch) => ({
          id: branch.id,
          parentId: branch.parentId,
          type: branch.type as ProgressBranchType,
          name: branch.name,
          color: branch.color,
          minHours: branch.minHours,
          maxHours: branch.maxHours,
          minComponents: branch.minComponents,
          maxComponents: branch.maxComponents,
        })),
        equivalences: new Map<string, RequirementExpr>(
          equivalences.map((row) => [row.code, row.expr]),
        ),
      }
    },
  }
}

export function academicRecordRepositories(
  db: Executor,
): AcademicRecordRepositories {
  const recordQuery = () =>
    db
      .select({ record: studentSubjectRecords, subjectCode: subjects.code })
      .from(studentSubjectRecords)
      .innerJoin(subjects, eq(subjects.id, studentSubjectRecords.subjectId))

  return {
    enrollments: {
      async findById(id) {
        const [row] = await db
          .select()
          .from(studentEnrollments)
          .where(eq(studentEnrollments.id, id))
        return (row as Enrollment | undefined) ?? null
      },
      async findCurrent(userId) {
        const [row] = await db
          .select()
          .from(studentEnrollments)
          .where(
            and(
              eq(studentEnrollments.userId, userId),
              eq(studentEnrollments.isCurrent, true),
            ),
          )
        return (row as Enrollment | undefined) ?? null
      },
      async listByUser(userId) {
        return db
          .select()
          .from(studentEnrollments)
          .where(eq(studentEnrollments.userId, userId))
          .orderBy(
            desc(studentEnrollments.isCurrent),
            desc(studentEnrollments.createdAt),
          )
      },
      async save(enrollment) {
        await db
          .insert(studentEnrollments)
          .values(enrollment)
          .onConflictDoUpdate({
            target: studentEnrollments.id,
            set: {
              curriculumId: enrollment.curriculumId,
              status: enrollment.status,
              isCurrent: enrollment.isCurrent,
              updatedAt: enrollment.updatedAt,
            },
          })
      },
    },
    records: {
      async findById(id) {
        const [row] = await recordQuery().where(
          eq(studentSubjectRecords.id, id),
        )
        return row
          ? toRecord({ ...row.record, subjectCode: row.subjectCode })
          : null
      },
      async listByEnrollment(enrollmentId) {
        const rows = await recordQuery()
          .where(eq(studentSubjectRecords.enrollmentId, enrollmentId))
          .orderBy(
            asc(studentSubjectRecords.termCode),
            asc(studentSubjectRecords.createdAt),
          )
        return rows.map((row) =>
          toRecord({ ...row.record, subjectCode: row.subjectCode }),
        )
      },
      async insert(record) {
        await db.insert(studentSubjectRecords).values(recordColumns(record))
      },
      async update(record) {
        await db
          .update(studentSubjectRecords)
          .set({
            status: record.status,
            grade: record.grade,
            updatedAt: record.updatedAt,
          })
          .where(eq(studentSubjectRecords.id, record.id))
      },
      async delete(id) {
        await db
          .delete(studentSubjectRecords)
          .where(eq(studentSubjectRecords.id, id))
      },
    },
    activities: {
      async findById(id) {
        const [row] = await db
          .select()
          .from(studentActivityRecords)
          .where(eq(studentActivityRecords.id, id))
        return (row as Activity | undefined) ?? null
      },
      async listByEnrollment(enrollmentId) {
        return db
          .select()
          .from(studentActivityRecords)
          .where(eq(studentActivityRecords.enrollmentId, enrollmentId))
          .orderBy(
            desc(studentActivityRecords.startedOn),
            desc(studentActivityRecords.createdAt),
          )
      },
      async save(activity) {
        const {
          id: _id,
          enrollmentId: _e,
          createdAt: _c,
          ...changes
        } = activity
        await db
          .insert(studentActivityRecords)
          .values(activity)
          .onConflictDoUpdate({
            target: studentActivityRecords.id,
            set: changes,
          })
      },
      async delete(id) {
        await db
          .delete(studentActivityRecords)
          .where(eq(studentActivityRecords.id, id))
      },
      async clearCategoriesOutside(enrollmentId, curriculumId) {
        const kept = db
          .select({ id: activityCategories.id })
          .from(activityCategories)
          .where(eq(activityCategories.curriculumId, curriculumId))
        await db
          .update(studentActivityRecords)
          .set({ categoryId: null })
          .where(
            and(
              eq(studentActivityRecords.enrollmentId, enrollmentId),
              isNotNull(studentActivityRecords.categoryId),
              notInArray(studentActivityRecords.categoryId, kept),
            ),
          )
      },
    },
    categories: {
      async findById(id) {
        const [row] = await db
          .select()
          .from(activityCategories)
          .where(eq(activityCategories.id, id))
        return (row as ActivityCategory | undefined) ?? null
      },
      async listByCurriculum(curriculumId) {
        return db
          .select()
          .from(activityCategories)
          .where(eq(activityCategories.curriculumId, curriculumId))
          .orderBy(
            asc(activityCategories.position),
            asc(activityCategories.name),
          )
      },
      async save(category) {
        const { id: _id, curriculumId: _c, ...changes } = category
        await db
          .insert(activityCategories)
          .values(category)
          .onConflictDoUpdate({ target: activityCategories.id, set: changes })
      },
      async delete(id) {
        await db.delete(activityCategories).where(eq(activityCategories.id, id))
      },
    },
    catalog: catalogReader(db),
    files: fileAttachmentRepository(db),
    audit: {
      async record(entry) {
        await db
          .insert(auditLogs)
          .values({ ...entry, module: 'academic-record' })
      },
    },
  }
}

@Injectable()
export class DrizzleAcademicRecordUnitOfWork implements AcademicRecordUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: AcademicRecordRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(academicRecordRepositories(tx)))
  }
}
