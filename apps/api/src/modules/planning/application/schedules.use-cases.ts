import { Inject, Injectable } from '@nestjs/common'
import type {
  ScheduleImportEntry,
  ScheduleImportInput,
  ScheduleImportResponse,
  ScheduleImportResult,
  ScheduleInput,
  ScheduleListQuery,
  ScheduleView,
} from '@ufc-flow/contracts'

import { DomainError } from '../../../shared/domain/domain-error'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import { PlanningErrors } from '../domain/errors'
import {
  PLANNING_UOW,
  type PlanningRepositories,
  type PlanningUnitOfWork,
  type ScheduleFilter,
} from '../domain/ports'
import { importItems, replaceItems, type Schedule } from '../domain/schedule'

// Curso ativo, EC publicada do curso e semestre cadastrado
async function resolveContext(
  repos: PlanningRepositories,
  input: { courseSlug: string; curriculumSlug: string; term: string },
) {
  const course = await repos.context.findCourse(input.courseSlug)
  if (!course?.isActive) throw PlanningErrors.courseNotFound()
  const curriculum = await repos.context.findPublishedCurriculum(
    course.id,
    input.curriculumSlug,
  )
  if (!curriculum) throw PlanningErrors.curriculumNotFound()
  const term = await repos.context.findTerm(input.term)
  if (!term) throw PlanningErrors.termNotFound()
  return { courseId: course.id, curriculumId: curriculum.id, termId: term.id }
}

// Agenda de outra pessoa é tratada como inexistente
async function findOwn(
  repos: PlanningRepositories,
  userId: string,
  id: string,
) {
  const schedule = await repos.schedules.findById(id)
  return schedule && schedule.userId === userId ? schedule : null
}

async function view(repos: PlanningRepositories, id: string) {
  const schedule = await repos.reader.get(id)
  if (!schedule) throw PlanningErrors.scheduleNotFound()
  return schedule
}

@Injectable()
export class ListSchedulesUseCase {
  constructor(@Inject(PLANNING_UOW) private readonly uow: PlanningUnitOfWork) {}

  execute(userId: string, query: ScheduleListQuery): Promise<ScheduleView[]> {
    return this.uow.run(async (repos) => {
      const filter: ScheduleFilter = {}
      if (query.course) {
        const course = await repos.context.findCourse(query.course)
        if (!course) return []
        filter.courseId = course.id
        if (query.curriculum) {
          const curriculum = await repos.context.findPublishedCurriculum(
            course.id,
            query.curriculum,
          )
          if (!curriculum) return []
          filter.curriculumId = curriculum.id
        }
      }
      if (query.term) {
        const term = await repos.context.findTerm(query.term)
        if (!term) return []
        filter.termId = term.id
      }
      return repos.reader.list(userId, filter)
    })
  }
}

// Cria ou substitui a agenda inteira pelo id gerado no cliente. Vale a
// última escrita que chega.
@Injectable()
export class SaveScheduleUseCase {
  constructor(
    @Inject(PLANNING_UOW) private readonly uow: PlanningUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(
    userId: string,
    id: string,
    input: ScheduleInput,
  ): Promise<ScheduleView> {
    return this.uow.run(async (repos) => {
      const existing = await repos.schedules.findById(id)
      if (existing && existing.userId !== userId) {
        throw PlanningErrors.scheduleNotFound()
      }
      const context = await resolveContext(repos, input)
      const now = this.clock.now()
      const sections = await repos.sections.byIds(
        input.items.map((item) => item.sectionId),
      )
      const items = replaceItems({
        current: existing?.items ?? [],
        input: input.items,
        sections: new Map(sections.map((section) => [section.id, section])),
        termId: context.termId,
        now,
      })
      const schedule: Schedule = {
        id,
        userId,
        ...context,
        name: input.name,
        position: input.position,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        items,
      }
      await repos.schedules.save(schedule)
      return view(repos, id)
    })
  }
}

@Injectable()
export class DeleteScheduleUseCase {
  constructor(@Inject(PLANNING_UOW) private readonly uow: PlanningUnitOfWork) {}

  execute(userId: string, id: string): Promise<void> {
    return this.uow.run(async (repos) => {
      if (!(await findOwn(repos, userId, id))) {
        throw PlanningErrors.scheduleNotFound()
      }
      await repos.schedules.delete(id)
    })
  }
}

const keyOf = (item: { subjectCode: string; sectionCode: string }) =>
  `${item.subjectCode}|${item.sectionCode}`

// Importação das agendas locais no primeiro login. Agenda já importada não
// duplica; curso, EC ou semestre desconhecidos falham só aquela agenda.
@Injectable()
export class ImportSchedulesUseCase {
  constructor(
    @Inject(PLANNING_UOW) private readonly uow: PlanningUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(
    userId: string,
    input: ScheduleImportInput,
  ): Promise<ScheduleImportResponse> {
    return this.uow.run(async (repos) => {
      const results: ScheduleImportResult[] = []
      for (const [position, entry] of input.schedules.entries()) {
        results.push(await this.importOne(repos, userId, entry, position))
      }
      return { results }
    })
  }

  private async importOne(
    repos: PlanningRepositories,
    userId: string,
    entry: ScheduleImportEntry,
    position: number,
  ): Promise<ScheduleImportResult> {
    const result = (
      status: ScheduleImportResult['status'],
      extra: Partial<ScheduleImportResult> = {},
    ): ScheduleImportResult => ({
      id: entry.id,
      status,
      error: null,
      notFound: [],
      skipped: [],
      schedule: null,
      ...extra,
    })

    const existing = await repos.schedules.findById(entry.id)
    if (existing) {
      return existing.userId === userId
        ? result('ALREADY_IMPORTED', { schedule: await view(repos, entry.id) })
        : result('FAILED', {
            error: { code: 'SCHEDULE_ID_TAKEN', detail: 'Id já usado' },
          })
    }

    let context: Awaited<ReturnType<typeof resolveContext>>
    try {
      context = await resolveContext(repos, entry)
    } catch (error) {
      if (!(error instanceof DomainError)) throw error
      return result('FAILED', {
        error: { code: error.code, detail: error.message },
      })
    }

    const found = new Map(
      (await repos.sections.byKeys(context.termId, entry.items)).map(
        (section) => [keyOf(section), section],
      ),
    )
    const notFound = entry.items
      .filter((item) => !found.has(keyOf(item)))
      .map(({ subjectCode, sectionCode }) => ({ subjectCode, sectionCode }))
    const now = this.clock.now()
    const { items, skipped } = importItems(
      entry.items.flatMap((item) => {
        const section = found.get(keyOf(item))
        return section ? [{ section, color: item.color }] : []
      }),
      now,
    )
    const byId = new Map([...found.values()].map((item) => [item.id, item]))
    await repos.schedules.save({
      id: entry.id,
      userId,
      ...context,
      name: entry.name,
      position,
      createdAt: now,
      updatedAt: now,
      items,
    })
    return result('IMPORTED', {
      notFound,
      skipped: skipped.map(({ sectionId, reason }) => ({
        subjectCode: byId.get(sectionId)!.subjectCode,
        sectionCode: byId.get(sectionId)!.sectionCode,
        reason,
      })),
      schedule: await view(repos, entry.id),
    })
  }
}
