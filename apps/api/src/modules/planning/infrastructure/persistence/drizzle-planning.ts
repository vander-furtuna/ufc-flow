import type { Weekday } from '@ufc-flow/academic-core'
import type { ScheduleColor, ScheduleView } from '@ufc-flow/contracts'
import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, inArray, type SQL } from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import type { Executor } from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import {
  courses,
  curricula,
} from '../../../catalog/infrastructure/persistence/catalog.schema'
import {
  academicTerms,
  classSections,
  classSectionSlots,
} from '../../../classes/infrastructure/persistence/classes.schema'
import { hydrateSections } from '../../../classes/infrastructure/persistence/drizzle-classes'
import type {
  PlanningContext,
  PlanningRepositories,
  PlanningUnitOfWork,
  ScheduleReader,
  ScheduleRepository,
  SectionLookup,
} from '../../domain/ports'
import type { SectionSnapshot } from '../../domain/schedule'
import { scheduleItems, schedules } from './planning.schema'

function scheduleRepository(db: Executor): ScheduleRepository {
  return {
    async findById(id) {
      const [row] = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, id))
      if (!row) return null
      const items = await db
        .select()
        .from(scheduleItems)
        .where(eq(scheduleItems.scheduleId, id))
        .orderBy(asc(scheduleItems.addedAt))
      return {
        ...row,
        items: items.map((item) => ({
          sectionId: item.classSectionId,
          subjectCode: item.subjectCode,
          color: item.color as ScheduleColor,
          slotsFingerprint: item.slotsFingerprint,
          addedAt: item.addedAt,
        })),
      }
    },
    async save({ items, ...schedule }) {
      await db
        .insert(schedules)
        .values(schedule)
        .onConflictDoUpdate({
          target: schedules.id,
          set: {
            courseId: schedule.courseId,
            curriculumId: schedule.curriculumId,
            termId: schedule.termId,
            name: schedule.name,
            position: schedule.position,
            updatedAt: schedule.updatedAt,
          },
        })
      // O agregado é pequeno: os itens são regravados inteiros
      await db
        .delete(scheduleItems)
        .where(eq(scheduleItems.scheduleId, schedule.id))
      if (items.length === 0) return
      await db.insert(scheduleItems).values(
        items.map((item) => ({
          scheduleId: schedule.id,
          classSectionId: item.sectionId,
          subjectCode: item.subjectCode,
          color: item.color,
          slotsFingerprint: item.slotsFingerprint,
          addedAt: item.addedAt,
        })),
      )
    },
    async delete(id) {
      await db.delete(schedules).where(eq(schedules.id, id))
    },
  }
}

function scheduleReader(db: Executor): ScheduleReader {
  async function load(where: SQL | undefined): Promise<ScheduleView[]> {
    const rows = await db
      .select({
        schedule: schedules,
        courseSlug: courses.slug,
        curriculumSlug: curricula.slug,
        term: academicTerms.code,
      })
      .from(schedules)
      .innerJoin(courses, eq(courses.id, schedules.courseId))
      .innerJoin(curricula, eq(curricula.id, schedules.curriculumId))
      .innerJoin(academicTerms, eq(academicTerms.id, schedules.termId))
      .where(where)
      .orderBy(asc(schedules.position), asc(schedules.createdAt))
    if (rows.length === 0) return []
    const items = await db
      .select({ item: scheduleItems, section: classSections })
      .from(scheduleItems)
      .innerJoin(
        classSections,
        eq(classSections.id, scheduleItems.classSectionId),
      )
      .where(
        inArray(
          scheduleItems.scheduleId,
          rows.map((row) => row.schedule.id),
        ),
      )
      .orderBy(asc(scheduleItems.addedAt), asc(scheduleItems.subjectCode))
    const details = new Map(
      (
        await hydrateSections(
          db,
          items.map((row) => row.section),
        )
      ).map((section) => [section.id, section]),
    )
    return rows.map(({ schedule, courseSlug, curriculumSlug, term }) => ({
      id: schedule.id,
      courseSlug,
      curriculumSlug,
      term,
      name: schedule.name,
      position: schedule.position,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
      items: items
        .filter((row) => row.item.scheduleId === schedule.id)
        .map(({ item, section }) => {
          const detail = details.get(section.id)!
          return {
            sectionId: section.id,
            subjectCode: section.subjectCode,
            subjectName: section.subjectName,
            sectionCode: section.sectionCode,
            color: item.color as ScheduleColor,
            instructors: detail.instructors,
            slots: detail.slots,
            validFrom: section.validFrom,
            validTo: section.validTo,
            addedAt: item.addedAt.toISOString(),
            changed: item.slotsFingerprint !== section.fingerprint,
            removed: section.removedAt !== null,
          }
        }),
    }))
  }

  return {
    list(userId, filter) {
      return load(
        and(
          eq(schedules.userId, userId),
          filter.courseId ? eq(schedules.courseId, filter.courseId) : undefined,
          filter.curriculumId
            ? eq(schedules.curriculumId, filter.curriculumId)
            : undefined,
          filter.termId ? eq(schedules.termId, filter.termId) : undefined,
        ),
      )
    },
    async get(id) {
      const [schedule] = await load(eq(schedules.id, id))
      return schedule ?? null
    },
  }
}

function planningContext(db: Executor): PlanningContext {
  return {
    async findCourse(slug) {
      const [row] = await db
        .select({ id: courses.id, isActive: courses.isActive })
        .from(courses)
        .where(eq(courses.slug, slug))
      return row ?? null
    },
    async findPublishedCurriculum(courseId, slug) {
      const [row] = await db
        .select({ id: curricula.id })
        .from(curricula)
        .where(
          and(
            eq(curricula.courseId, courseId),
            eq(curricula.slug, slug),
            eq(curricula.status, 'PUBLISHED'),
          ),
        )
      return row ?? null
    },
    async findTerm(code) {
      const [row] = await db
        .select({ id: academicTerms.id })
        .from(academicTerms)
        .where(eq(academicTerms.code, code))
      return row ?? null
    },
  }
}

// Só o que as regras da agenda precisam: horários, fingerprint e removida
async function snapshots(
  db: Executor,
  where: SQL | undefined,
): Promise<SectionSnapshot[]> {
  const rows = await db.select().from(classSections).where(where)
  if (rows.length === 0) return []
  const slots = await db
    .select()
    .from(classSectionSlots)
    .where(
      inArray(
        classSectionSlots.classSectionId,
        rows.map((row) => row.id),
      ),
    )
  return rows.map((row) => ({
    id: row.id,
    termId: row.termId,
    subjectCode: row.subjectCode,
    sectionCode: row.sectionCode,
    fingerprint: row.fingerprint,
    removed: row.removedAt !== null,
    slots: slots
      .filter((slot) => slot.classSectionId === row.id)
      .map((slot) => ({
        weekday: slot.weekday as Weekday,
        startTime: slot.startTime.slice(0, 5),
        endTime: slot.endTime.slice(0, 5),
      })),
  }))
}

function sectionLookup(db: Executor): SectionLookup {
  return {
    async byIds(ids) {
      if (ids.length === 0) return []
      return snapshots(db, inArray(classSections.id, [...ids]))
    },
    async byKeys(termId, keys) {
      if (keys.length === 0) return []
      const wanted = new Set(
        keys.map((key) => `${key.subjectCode}|${key.sectionCode}`),
      )
      const found = await snapshots(
        db,
        and(
          eq(classSections.termId, termId),
          inArray(classSections.subjectCode, [
            ...new Set(keys.map((key) => key.subjectCode)),
          ]),
        ),
      )
      return found.filter((section) =>
        wanted.has(`${section.subjectCode}|${section.sectionCode}`),
      )
    },
  }
}

export function planningRepositories(db: Executor): PlanningRepositories {
  return {
    schedules: scheduleRepository(db),
    reader: scheduleReader(db),
    context: planningContext(db),
    sections: sectionLookup(db),
  }
}

@Injectable()
export class DrizzlePlanningUnitOfWork implements PlanningUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: PlanningRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(planningRepositories(tx)))
  }
}
