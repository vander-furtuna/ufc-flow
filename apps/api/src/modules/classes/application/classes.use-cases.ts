import { Inject, Injectable } from '@nestjs/common'
import type {
  AcademicTerm as AcademicTermView,
  AcademicTermInput,
  CourseSections,
  ScrapeRun,
  ScrapeTrigger,
  UpdateAcademicTermInput,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../shared/domain/events'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { ClassesErrors } from '../domain/errors'
import {
  CLASSES_UOW,
  COLLECTION_SETTINGS,
  PAUSE,
  SIGAA_SECTION_SOURCE,
  type ClassesRepositories,
  type ClassesUnitOfWork,
  type CollectionSettings,
  type CourseRef,
  type OfferedSection,
  type Pause,
  type ScrapeRunRecord,
  type SigaaSectionSource,
} from '../domain/ports'
import { planSync } from '../domain/section'
import { collectableTerms, newTerm, type AcademicTerm } from '../domain/term'

export const toTermView = (term: AcademicTerm): AcademicTermView => ({
  id: term.id,
  code: term.code,
  startsAt: term.startsAt,
  endsAt: term.endsAt,
  isCurrent: term.isCurrent,
})

function toRunView(
  run: ScrapeRunRecord,
  course: CourseRef,
  term: AcademicTerm,
): ScrapeRun {
  return {
    id: run.id,
    courseSlug: course.slug,
    term: term.code,
    trigger: run.trigger,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    sectionsSeen: run.sectionsSeen,
    sectionsChanged: run.sectionsChanged,
    error: run.error,
  }
}

function groupBySubject(sections: readonly OfferedSection[]) {
  const groups = new Map<string, CourseSections['subjects'][number]>()
  for (const section of [...sections].sort(
    (a, b) =>
      a.subjectCode.localeCompare(b.subjectCode) ||
      a.sectionCode.localeCompare(b.sectionCode),
  )) {
    const group = groups.get(section.subjectCode) ?? {
      code: section.subjectCode,
      name: section.subjectName,
      sections: [],
    }
    group.sections.push({
      id: section.id,
      subjectCode: section.subjectCode,
      sectionCode: section.sectionCode,
      instructors: section.instructors,
      reservedSeats: section.reservedSeats,
      slots: section.slots.map((slot) => ({
        weekday: slot.weekday,
        startTime: slot.startTime.slice(0, 5),
        endTime: slot.endTime.slice(0, 5),
      })),
      validFrom: section.validFrom,
      validTo: section.validTo,
      fingerprint: section.fingerprint,
    })
    groups.set(section.subjectCode, group)
  }
  return [...groups.values()]
}

async function findTerm(repos: ClassesRepositories, code: string) {
  const term = await repos.terms.findByCode(code)
  if (!term) throw ClassesErrors.termNotFound()
  return term
}

function requireAdmin(actor: Actor) {
  if (!AccessPolicy.canAdministerPlatform(actor)) {
    throw ClassesErrors.accessDenied()
  }
}

@Injectable()
export class ListTermsUseCase {
  constructor(@Inject(CLASSES_UOW) private readonly uow: ClassesUnitOfWork) {}

  execute(): Promise<AcademicTermView[]> {
    return this.uow.run(async ({ terms }) =>
      (await terms.list())
        .sort((a, b) => b.code.localeCompare(a.code))
        .map(toTermView),
    )
  }
}

// Semestre vigente: substitui NEXT_PUBLIC_CURRENT_YEAR/SEMESTER do web
@Injectable()
export class GetCurrentTermUseCase {
  constructor(@Inject(CLASSES_UOW) private readonly uow: ClassesUnitOfWork) {}

  execute(): Promise<AcademicTermView> {
    return this.uow.run(async ({ terms }) => {
      const current = await terms.findCurrent()
      if (!current) throw ClassesErrors.noCurrentTerm()
      return toTermView(current)
    })
  }
}

@Injectable()
export class CreateTermUseCase {
  constructor(
    @Inject(CLASSES_UOW) private readonly uow: ClassesUnitOfWork,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  execute(actor: Actor, input: AcademicTermInput): Promise<AcademicTermView> {
    requireAdmin(actor)
    return this.uow.run(async ({ terms }) => {
      if (await terms.findByCode(input.code)) throw ClassesErrors.termExists()
      const term = newTerm(input, this.ids.next())
      await terms.insert(term)
      return toTermView(term)
    })
  }
}

@Injectable()
export class UpdateTermUseCase {
  constructor(@Inject(CLASSES_UOW) private readonly uow: ClassesUnitOfWork) {}

  execute(
    actor: Actor,
    code: string,
    input: UpdateAcademicTermInput,
  ): Promise<AcademicTermView> {
    requireAdmin(actor)
    return this.uow.run(async (repos) => {
      const term = await findTerm(repos, code)
      const updated = {
        ...newTerm({ code, ...input }, term.id),
        isCurrent: term.isCurrent,
      }
      await repos.terms.update(updated)
      return toTermView(updated)
    })
  }
}

// Desmarca o anterior e marca este, na mesma transação
@Injectable()
export class MarkCurrentTermUseCase {
  constructor(@Inject(CLASSES_UOW) private readonly uow: ClassesUnitOfWork) {}

  execute(actor: Actor, code: string): Promise<AcademicTermView> {
    requireAdmin(actor)
    return this.uow.run(async (repos) => {
      const term = await findTerm(repos, code)
      await repos.terms.setCurrent(term.id)
      return toTermView({ ...term, isCurrent: true })
    })
  }
}

@Injectable()
export class DeleteTermUseCase {
  constructor(@Inject(CLASSES_UOW) private readonly uow: ClassesUnitOfWork) {}

  execute(actor: Actor, code: string): Promise<void> {
    requireAdmin(actor)
    return this.uow.run(async (repos) => {
      const term = await findTerm(repos, code)
      if (await repos.terms.hasSections(term.id)) {
        throw ClassesErrors.termHasSections()
      }
      await repos.terms.delete(term.id)
    })
  }
}

// Turmas ofertadas a um curso num semestre: o que o web mostra na agenda
@Injectable()
export class ListCourseSectionsUseCase {
  constructor(@Inject(CLASSES_UOW) private readonly uow: ClassesUnitOfWork) {}

  execute(termCode: string, courseSlug: string): Promise<CourseSections> {
    return this.uow.run(async (repos) => {
      const term = await findTerm(repos, termCode)
      const course = await repos.courses.findBySlug(courseSlug)
      if (!course?.isActive) throw ClassesErrors.courseNotFound()
      const sections = await repos.sections.listOffered(term.id, course.id)
      const collectedAt = await repos.runs.lastSuccess(course.id, term.id)
      return {
        term: term.code,
        courseSlug: course.slug,
        collectedAt: collectedAt?.toISOString() ?? null,
        subjects: groupBySubject(sections),
      }
    })
  }
}

// Coleta as turmas de um curso num semestre. A execução fica em scrape_runs
// mesmo quando o SIGAA falha.
@Injectable()
export class CollectSectionsUseCase {
  constructor(
    @Inject(CLASSES_UOW) private readonly uow: ClassesUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(SIGAA_SECTION_SOURCE) private readonly source: SigaaSectionSource,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(
    actor: Actor | null,
    termCode: string,
    courseSlug: string,
    trigger: ScrapeTrigger,
  ): Promise<ScrapeRun> {
    const { term, course, run } = await this.uow.run(async (repos) => {
      const term = await findTerm(repos, termCode)
      const course = await repos.courses.findBySlug(courseSlug)
      if (!course) throw ClassesErrors.courseNotFound()
      // Disparo manual: moderador do curso ou admin
      if (actor && !AccessPolicy.canManageCurricula(actor, course.id)) {
        throw ClassesErrors.accessDenied()
      }
      const run: ScrapeRunRecord = {
        id: this.ids.next(),
        courseId: course.id,
        termId: term.id,
        trigger,
        status: 'RUNNING',
        startedAt: this.clock.now(),
        finishedAt: null,
        sectionsSeen: 0,
        sectionsChanged: 0,
        error: null,
      }
      await repos.runs.insert(run)
      return { term, course, run }
    })

    let finished: ScrapeRunRecord
    let removedIds: string[] = []
    let rescheduledIds: string[] = []
    try {
      const scraped = await this.source.fetch(
        course.sigaaId,
        term.year,
        term.period,
      )
      finished = await this.uow.run(async ({ sections, runs }) => {
        const now = this.clock.now()
        const existing = await sections.findByKeys(term.id, scraped)
        const plan = planSync(scraped, {
          termId: term.id,
          now,
          newId: () => this.ids.next(),
          existing,
        })
        await sections.saveAll(plan.sections)
        await sections.replaceOffers(term.id, course.id, plan.offers, now)
        removedIds = await sections.markOrphansRemoved(term.id, now)
        rescheduledIds = plan.rescheduledIds
        const done: ScrapeRunRecord = {
          ...run,
          status: 'SUCCESS',
          finishedAt: now,
          sectionsSeen: plan.sections.length,
          sectionsChanged: plan.changed,
        }
        await runs.update(done)
        return done
      })
    } catch (error) {
      finished = {
        ...run,
        status: 'FAILED',
        finishedAt: this.clock.now(),
        error: (error as Error).message.slice(0, 500),
      }
      await this.uow.run(({ runs }) => runs.update(finished))
      this.events.publish([
        {
          type: 'ScrapeFailed',
          runId: finished.id,
          courseId: course.id,
          termId: term.id,
          error: finished.error ?? '',
          actorId: actor?.userId ?? null,
          occurredAt: finished.finishedAt!,
        },
      ])
      return toRunView(finished, course, term)
    }
    // Depois do commit: quem tem essas turmas na agenda é avisado
    if (rescheduledIds.length > 0 || removedIds.length > 0) {
      this.events.publish([
        {
          type: 'SectionsChanged',
          termId: term.id,
          changedSectionIds: rescheduledIds,
          removedSectionIds: removedIds,
          occurredAt: finished.finishedAt!,
        },
      ])
    }
    return toRunView(finished, course, term)
  }
}

// Coleta agendada: cada curso ativo, no vigente e no próximo durante a
// matrícula, em sequência e com pausa entre cursos
@Injectable()
export class CollectAllSectionsUseCase {
  constructor(
    @Inject(CLASSES_UOW) private readonly uow: ClassesUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(CollectSectionsUseCase)
    private readonly collect: CollectSectionsUseCase,
    @Inject(PAUSE) private readonly pause: Pause,
    @Inject(COLLECTION_SETTINGS) private readonly settings: CollectionSettings,
  ) {}

  async execute(): Promise<ScrapeRun[]> {
    const { courses, terms } = await this.uow.run(async (repos) => ({
      courses: await repos.courses.listActive(),
      terms: collectableTerms(await repos.terms.list(), this.clock.now()),
    }))
    const results: ScrapeRun[] = []
    for (const term of terms) {
      for (const course of courses) {
        if (results.length > 0) await this.pause(this.settings.pauseMs)
        results.push(
          await this.collect.execute(null, term.code, course.slug, 'SCHEDULED'),
        )
      }
    }
    return results
  }
}
