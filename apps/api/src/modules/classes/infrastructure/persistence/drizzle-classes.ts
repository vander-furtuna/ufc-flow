import { randomUUID } from 'node:crypto'

import type { Weekday } from '@ufc-flow/academic-core'
import { Inject, Injectable } from '@nestjs/common'
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  notExists,
  sql,
} from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import {
  mapUnique,
  type Executor,
} from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import { courses } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { ClassesErrors } from '../../domain/errors'
import type {
  ClassesRepositories,
  ClassesUnitOfWork,
  CourseDirectory,
  OfferedSection,
  ScrapeRunRecord,
  ScrapeRunRepository,
  SectionRepository,
  TermRepository,
} from '../../domain/ports'
import type { SectionRecord } from '../../domain/section'
import type { AcademicTerm } from '../../domain/term'
import {
  academicTerms,
  classSectionInstructors,
  classSectionOffers,
  classSections,
  classSectionSlots,
  instructors,
  scrapeRuns,
} from './classes.schema'

type TermRow = typeof academicTerms.$inferSelect
type SectionRow = typeof classSections.$inferSelect

const toTerm = (row: TermRow): AcademicTerm => ({
  ...row,
  period: row.period as 1 | 2,
})

const termRow = (term: AcademicTerm) => ({
  id: term.id,
  code: term.code,
  year: term.year,
  period: term.period,
  startsAt: term.startsAt,
  endsAt: term.endsAt,
  isCurrent: term.isCurrent,
})

function terms(db: Executor): TermRepository {
  return {
    async list() {
      return (await db.select().from(academicTerms)).map(toTerm)
    },
    async findByCode(code) {
      const [row] = await db
        .select()
        .from(academicTerms)
        .where(eq(academicTerms.code, code))
      return row ? toTerm(row) : null
    },
    async findCurrent() {
      const [row] = await db
        .select()
        .from(academicTerms)
        .where(eq(academicTerms.isCurrent, true))
      return row ? toTerm(row) : null
    },
    async insert(term) {
      await mapUnique(db.insert(academicTerms).values(termRow(term)), {
        academic_terms_code_unique: ClassesErrors.termExists,
      })
    },
    async update(term) {
      await db
        .update(academicTerms)
        .set(termRow(term))
        .where(eq(academicTerms.id, term.id))
    },
    async delete(id) {
      await db.delete(academicTerms).where(eq(academicTerms.id, id))
    },
    async setCurrent(id) {
      // Desmarca antes de marcar, por causa do índice único parcial
      await db
        .update(academicTerms)
        .set({ isCurrent: false })
        .where(eq(academicTerms.isCurrent, true))
      await db
        .update(academicTerms)
        .set({ isCurrent: true })
        .where(eq(academicTerms.id, id))
    },
    async hasSections(termId) {
      const [row] = await db
        .select({ id: classSections.id })
        .from(classSections)
        .where(eq(classSections.termId, termId))
        .limit(1)
      return row !== undefined
    },
  }
}

// Monta as turmas com horários e docentes, numa consulta por tabela (a
// agenda também usa)
export async function hydrateSections(
  db: Executor,
  rows: readonly SectionRow[],
): Promise<SectionRecord[]> {
  if (rows.length === 0) return []
  const ids = rows.map((row) => row.id)
  const [slots, teachers] = await Promise.all([
    db
      .select()
      .from(classSectionSlots)
      .where(inArray(classSectionSlots.classSectionId, ids))
      .orderBy(
        asc(classSectionSlots.weekday),
        asc(classSectionSlots.startTime),
      ),
    db
      .select({
        classSectionId: classSectionInstructors.classSectionId,
        siape: instructors.siape,
        name: instructors.name,
        profileUrl: instructors.profileUrl,
      })
      .from(classSectionInstructors)
      .innerJoin(
        instructors,
        eq(instructors.id, classSectionInstructors.instructorId),
      )
      .where(inArray(classSectionInstructors.classSectionId, ids))
      .orderBy(asc(classSectionInstructors.position)),
  ])
  return rows.map((row) => ({
    id: row.id,
    termId: row.termId,
    subjectCode: row.subjectCode,
    subjectName: row.subjectName,
    sectionCode: row.sectionCode,
    validFrom: row.validFrom,
    validTo: row.validTo,
    fingerprint: row.fingerprint,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    removedAt: row.removedAt,
    slots: slots
      .filter((slot) => slot.classSectionId === row.id)
      .map((slot) => ({
        weekday: slot.weekday as Weekday,
        startTime: slot.startTime.slice(0, 5),
        endTime: slot.endTime.slice(0, 5),
      })),
    instructors: teachers
      .filter((teacher) => teacher.classSectionId === row.id)
      .map(({ siape, name, profileUrl }) => ({ siape, name, profileUrl })),
  }))
}

// Garante os docentes pelo SIAPE (o nome pode mudar) e devolve id por SIAPE
async function upsertInstructors(
  db: Executor,
  sections: readonly SectionRecord[],
) {
  const bySiape = new Map(
    sections
      .flatMap((section) => section.instructors)
      .map((instructor) => [instructor.siape, instructor]),
  )
  if (bySiape.size === 0) return new Map<string, string>()
  const rows = await db
    .insert(instructors)
    .values(
      [...bySiape.values()].map((instructor) => ({
        id: randomUUID(),
        ...instructor,
      })),
    )
    .onConflictDoUpdate({
      target: instructors.siape,
      set: {
        name: sql`excluded.name`,
        profileUrl: sql`excluded.profile_url`,
      },
    })
    .returning({ id: instructors.id, siape: instructors.siape })
  return new Map(rows.map((row) => [row.siape, row.id]))
}

function sections(db: Executor): SectionRepository {
  return {
    async findByKeys(termId, keys) {
      if (keys.length === 0) return []
      const codes = [...new Set(keys.map((key) => key.subjectCode))]
      const wanted = new Set(
        keys.map((key) => `${key.subjectCode}|${key.sectionCode}`),
      )
      const rows = await db
        .select()
        .from(classSections)
        .where(
          and(
            eq(classSections.termId, termId),
            inArray(classSections.subjectCode, codes),
          ),
        )
      return hydrateSections(
        db,
        rows.filter((row) =>
          wanted.has(`${row.subjectCode}|${row.sectionCode}`),
        ),
      )
    },

    async saveAll(records) {
      if (records.length === 0) return
      const instructorIds = await upsertInstructors(db, records)
      await db
        .insert(classSections)
        .values(
          records.map((record) => ({
            id: record.id,
            termId: record.termId,
            subjectCode: record.subjectCode,
            subjectName: record.subjectName,
            // Liga ao catálogo pelo código, quando a disciplina existe
            subjectId: sql`(SELECT id FROM subjects WHERE code = ${record.subjectCode})`,
            sectionCode: record.sectionCode,
            validFrom: record.validFrom,
            validTo: record.validTo,
            fingerprint: record.fingerprint,
            firstSeenAt: record.firstSeenAt,
            lastSeenAt: record.lastSeenAt,
            removedAt: record.removedAt,
          })),
        )
        .onConflictDoUpdate({
          target: classSections.id,
          set: {
            subjectName: sql`excluded.subject_name`,
            subjectId: sql`excluded.subject_id`,
            validFrom: sql`excluded.valid_from`,
            validTo: sql`excluded.valid_to`,
            fingerprint: sql`excluded.fingerprint`,
            lastSeenAt: sql`excluded.last_seen_at`,
            removedAt: sql`excluded.removed_at`,
            updatedAt: sql`now()`,
          },
        })
      // Horários e docentes são regravados inteiros
      const ids = records.map((record) => record.id)
      await db
        .delete(classSectionSlots)
        .where(inArray(classSectionSlots.classSectionId, ids))
      await db
        .delete(classSectionInstructors)
        .where(inArray(classSectionInstructors.classSectionId, ids))
      const slots = records.flatMap((record) =>
        record.slots.map((slot) => ({
          id: randomUUID(),
          classSectionId: record.id,
          ...slot,
        })),
      )
      if (slots.length > 0) await db.insert(classSectionSlots).values(slots)
      const links = records.flatMap((record) =>
        record.instructors.map((instructor, position) => ({
          classSectionId: record.id,
          instructorId: instructorIds.get(instructor.siape) as string,
          position,
        })),
      )
      if (links.length > 0) {
        await db
          .insert(classSectionInstructors)
          .values(links)
          .onConflictDoNothing()
      }
    },

    async replaceOffers(termId, courseId, offers, now) {
      await db
        .delete(classSectionOffers)
        .where(
          and(
            eq(classSectionOffers.courseId, courseId),
            inArray(
              classSectionOffers.classSectionId,
              db
                .select({ id: classSections.id })
                .from(classSections)
                .where(eq(classSections.termId, termId)),
            ),
          ),
        )
      if (offers.length === 0) return
      await db.insert(classSectionOffers).values(
        offers.map((offer) => ({
          classSectionId: offer.sectionId,
          courseId,
          reservedSeats: offer.reservedSeats,
          lastSeenAt: now,
        })),
      )
    },

    async markOrphansRemoved(termId, now) {
      const rows = await db
        .update(classSections)
        .set({ removedAt: now, updatedAt: now })
        .where(
          and(
            eq(classSections.termId, termId),
            isNull(classSections.removedAt),
            notExists(
              db
                .select({ id: classSectionOffers.classSectionId })
                .from(classSectionOffers)
                .where(eq(classSectionOffers.classSectionId, classSections.id)),
            ),
          ),
        )
        .returning({ id: classSections.id })
      return rows.length
    },

    async listOffered(termId, courseId) {
      const rows = await db
        .select({
          section: classSections,
          seats: classSectionOffers.reservedSeats,
        })
        .from(classSections)
        .innerJoin(
          classSectionOffers,
          eq(classSectionOffers.classSectionId, classSections.id),
        )
        .where(
          and(
            eq(classSections.termId, termId),
            eq(classSectionOffers.courseId, courseId),
            isNull(classSections.removedAt),
          ),
        )
      const seats = new Map(rows.map((row) => [row.section.id, row.seats]))
      const records = await hydrateSections(
        db,
        rows.map((row) => row.section),
      )
      return records.map((record): OfferedSection => ({
        ...record,
        reservedSeats: seats.get(record.id) ?? 0,
      }))
    },
  }
}

function courseDirectory(db: Executor): CourseDirectory {
  const columns = {
    id: courses.id,
    slug: courses.slug,
    sigaaId: courses.sigaaId,
    isActive: courses.isActive,
  }
  return {
    async findBySlug(slug) {
      const [row] = await db
        .select(columns)
        .from(courses)
        .where(eq(courses.slug, slug))
      return row ?? null
    },
    listActive() {
      return db
        .select(columns)
        .from(courses)
        .where(eq(courses.isActive, true))
        .orderBy(asc(courses.slug))
    },
  }
}

function runs(db: Executor): ScrapeRunRepository {
  return {
    async insert(run) {
      await db.insert(scrapeRuns).values(run)
    },
    async update(run: ScrapeRunRecord) {
      await db.update(scrapeRuns).set(run).where(eq(scrapeRuns.id, run.id))
    },
    async lastSuccess(courseId, termId) {
      const [row] = await db
        .select({ finishedAt: scrapeRuns.finishedAt })
        .from(scrapeRuns)
        .where(
          and(
            eq(scrapeRuns.courseId, courseId),
            eq(scrapeRuns.termId, termId),
            eq(scrapeRuns.status, 'SUCCESS'),
          ),
        )
        .orderBy(desc(scrapeRuns.finishedAt))
        .limit(1)
      return row?.finishedAt ?? null
    },
  }
}

export function classesRepositories(db: Executor): ClassesRepositories {
  return {
    terms: terms(db),
    sections: sections(db),
    courses: courseDirectory(db),
    runs: runs(db),
  }
}

@Injectable()
export class DrizzleClassesUnitOfWork implements ClassesUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: ClassesRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(classesRepositories(tx)))
  }
}
