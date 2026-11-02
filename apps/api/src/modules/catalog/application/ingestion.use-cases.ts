import { collectCodes } from '@ufc-flow/academic-core'
import { Inject, Injectable } from '@nestjs/common'
import type {
  CursorPage,
  CurriculumImportDetail,
  CurriculumImportListQuery,
  CurriculumImportSource,
  CurriculumImportV1,
  CurriculumImportView,
  ManagedCurriculum,
  ReviewResolution,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import { decodeCursor, pageOf } from '../../../shared/domain/cursor'
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../shared/domain/events'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { checkImportCourse } from '../domain/course'
import {
  curriculumFromImport,
  diffCurriculum,
  planImport,
} from '../domain/curriculum-import'
import { CatalogErrors } from '../domain/errors'
import {
  CATALOG_UOW,
  type CatalogRepositories,
  type CatalogUnitOfWork,
  type CurriculumImport,
} from '../domain/ports'
import { resolveReviewPoint } from '../domain/review-points'
import {
  setEquivalences,
  updateGlobalSubject,
  type Subject,
} from '../domain/subject'
import { CurriculumEditor } from './curriculum-editor'
import { ImportApplier } from './import-applier'
import { toImportView, toReviewPointView } from './views'

async function viewOf(
  repos: CatalogRepositories,
  record: CurriculumImport,
): Promise<CurriculumImportView> {
  const course = record.courseId
    ? await repos.courses.findById(record.courseId)
    : null
  const names = await repos.users.names(
    record.importedBy ? [record.importedBy] : [],
  )
  return toImportView(record, course, names)
}

// Quem pode ver ou mexer numa importação: admin, quem modera o curso e,
// enquanto o curso não existe, quem enviou
function canHandle(actor: Actor, record: CurriculumImport) {
  if (record.courseId !== null) {
    return AccessPolicy.canManageCurricula(actor, record.courseId)
  }
  return actor.isAdmin || record.importedBy === actor.userId
}

async function loadImport(
  repos: CatalogRepositories,
  actor: Actor,
  id: string,
): Promise<CurriculumImport> {
  const record = await repos.imports.findById(id)
  if (!record) throw CatalogErrors.importNotFound()
  if (!canHandle(actor, record)) throw CatalogErrors.accessDenied()
  return record
}

// POST /ingestion/curriculum-imports: guarda o arquivo como veio e, se o
// curso existe e a EC ainda não, já cria o rascunho. Reimportação espera o
// diff ser conferido; curso inexistente deixa a importação pendente.
@Injectable()
export class CreateImportUseCase {
  constructor(
    @Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(ImportApplier) private readonly applier: ImportApplier,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(
    actor: Actor,
    payload: CurriculumImportV1,
    source: CurriculumImportSource,
  ): Promise<CurriculumImportView> {
    let pending: { courseName: string; importedBy: string } | null = null
    const view = await this.uow.run(async (repos) => {
      const sigaaId = payload.course.sigaaId
      const course = await repos.courses.findBySigaaId(sigaaId)
      const allowed = course
        ? AccessPolicy.canManageCurricula(actor, course.id)
        : actor.isAdmin || actor.moderatedCourseIds.size > 0
      if (!allowed || actor.userId === null) throw CatalogErrors.accessDenied()

      const sigaaCourse = await repos.sigaaCourses.find(sigaaId)
      if (sigaaCourse) checkImportCourse(payload, sigaaCourse)
      // Curso ainda não existe no Flow: a importação espera um admin
      if (!course) {
        pending = {
          courseName: sigaaCourse?.name ?? payload.course.name,
          importedBy: actor.userId,
        }
      }

      const now = this.clock.now()
      let record: CurriculumImport = {
        id: this.ids.next(),
        courseId: course?.id ?? null,
        courseSigaaId: sigaaId,
        curriculumId: null,
        source,
        payload,
        status: 'RECEIVED',
        reviewPoints: [],
        importedBy: actor.userId,
        createdAt: now,
        appliedAt: null,
      }
      await repos.imports.insert(record)

      if (course) {
        const existing = await repos.curricula.findByCode(
          course.id,
          payload.curriculum.code,
        )
        if (existing) {
          record = { ...record, curriculumId: existing.id }
          await repos.imports.update(record)
        } else {
          record = (await this.applier.apply(repos, record, course)).record
        }
      }
      await repos.audit.record({
        id: this.ids.next(),
        actorId: actor.userId,
        entity: 'curriculum_import',
        entityId: record.id,
        action: 'curriculum_import.received',
        changes: {
          sigaaId,
          code: payload.curriculum.code,
          status: record.status,
        },
        createdAt: now,
      })
      return viewOf(repos, record)
    })
    if (pending) {
      const { courseName, importedBy } = pending
      this.events.publish([
        {
          type: 'CurriculumImportPending',
          importId: view.id,
          sigaaId: payload.course.sigaaId,
          courseName,
          importedBy,
          occurredAt: new Date(view.createdAt),
        },
      ])
    }
    return view
  }
}

@Injectable()
export class ListImportsUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(
    actor: Actor,
    query: CurriculumImportListQuery,
  ): Promise<CursorPage<CurriculumImportView>> {
    if (actor.userId === null) throw CatalogErrors.accessDenied()
    const userId = actor.userId
    const before = decodeCursor(query.cursor)
    return this.uow.run(async (repos) => {
      const rows = await repos.imports.list({
        status: query.status ?? null,
        visibleTo: actor.isAdmin
          ? null
          : { courseIds: [...actor.moderatedCourseIds], userId },
        before,
        limit: query.limit,
      })
      const page = pageOf(rows, query.limit, (row) => row)
      const courseIds = [
        ...new Set(page.items.flatMap((row) => row.courseId ?? [])),
      ]
      const courses = new Map(
        (
          await Promise.all(courseIds.map((id) => repos.courses.findById(id)))
        ).flatMap((course) => (course ? [[course.id, course] as const] : [])),
      )
      const names = await repos.users.names([
        ...new Set(page.items.flatMap((row) => row.importedBy ?? [])),
      ])
      return {
        items: page.items.map((row) =>
          toImportView(
            row,
            row.courseId ? (courses.get(row.courseId) ?? null) : null,
            names,
          ),
        ),
        nextCursor: page.nextCursor,
      }
    })
  }
}

// Detalhe com o diff (reimportação ainda não aplicada) e os pontos para
// revisar: os gravados ou, antes de aplicar, uma prévia
@Injectable()
export class GetImportUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(actor: Actor, id: string): Promise<CurriculumImportDetail> {
    return this.uow.run(async (repos) => {
      const record = await loadImport(repos, actor, id)
      const view = await viewOf(repos, record)
      if (record.status !== 'RECEIVED') {
        return {
          ...view,
          diff: null,
          reviewPoints: record.reviewPoints.map(toReviewPointView),
        }
      }

      const { payload } = record
      const cited = payload.subjects.flatMap((item) => [
        item.code,
        ...collectCodes(item.prerequisites),
        ...collectCodes(item.corequisites),
      ])
      const catalog = await repos.subjects.findByCodes([...new Set(cited)])
      let counter = 0
      const preview = planImport(payload, {
        catalog,
        importId: record.id,
        importedByAdmin: record.importedBy
          ? await repos.users.isAdmin(record.importedBy)
          : false,
        newId: () => `preview-${++counter}`,
        now: record.createdAt,
      })
      const existing = record.curriculumId
        ? await repos.curricula.findById(record.curriculumId)
        : null
      const diff = existing
        ? diffCurriculum(
            existing,
            curriculumFromImport(payload, {
              id: existing.id,
              courseId: existing.courseId,
              subjectIdOf: (code) => code,
              newId: () => `preview-${++counter}`,
              now: record.createdAt,
            }),
          )
        : null
      return {
        ...view,
        diff,
        reviewPoints: preview.reviewPoints.map(toReviewPointView),
      }
    })
  }
}

// Aplica a reimportação depois de conferido o diff
@Injectable()
export class ApplyImportUseCase {
  constructor(
    @Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork,
    @Inject(ImportApplier) private readonly applier: ImportApplier,
    @Inject(GetImportUseCase) private readonly getImport: GetImportUseCase,
  ) {}

  async execute(actor: Actor, id: string): Promise<CurriculumImportDetail> {
    await this.uow.run(async (repos) => {
      const record = await loadImport(repos, actor, id)
      if (record.status !== 'RECEIVED') throw CatalogErrors.importNotPending()
      if (record.courseId === null) throw CatalogErrors.importCourseMissing()
      const course = await repos.courses.findById(record.courseId)
      if (!course) throw CatalogErrors.courseNotFound()
      await this.applier.apply(repos, record, course)
    })
    return this.getImport.execute(actor, id)
  }
}

@Injectable()
export class DiscardImportUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(actor: Actor, id: string): Promise<CurriculumImportView> {
    return this.uow.run(async (repos) => {
      const record = await loadImport(repos, actor, id)
      if (record.status !== 'RECEIVED') throw CatalogErrors.importNotPending()
      const discarded: CurriculumImport = { ...record, status: 'DISCARDED' }
      await repos.imports.update(discarded)
      return viewOf(repos, discarded)
    })
  }
}

// "Manter catálogo", "Usar nome do SIGAA", "Ciente"... Usar o que veio do
// SIGAA muda a disciplina global, sob as travas dela.
@Injectable()
export class ResolveReviewPointUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(
    actor: Actor,
    importId: string,
    key: string,
    resolution: ReviewResolution,
  ): Promise<ManagedCurriculum> {
    return this.editor.uow.run(async (repos) => {
      const record = await loadImport(repos, actor, importId)
      if (record.curriculumId === null || record.status !== 'APPLIED') {
        throw CatalogErrors.reviewPointNotFound()
      }
      const point = record.reviewPoints.find((item) => item.key === key)
      if (!point) throw CatalogErrors.reviewPointNotFound()
      const now = this.editor.clock.now()
      const { point: resolved, effect } = resolveReviewPoint(
        point,
        resolution,
        {
          isAdmin: actor.isAdmin,
          now,
        },
      )

      if (effect) {
        const subject = (await repos.subjects.findByCodes([effect.code])).get(
          effect.code,
        ) as Subject
        const usedInPublished = await repos.subjects.usedInPublished(subject.id)
        const updated =
          effect.kind === 'RENAME_SUBJECT'
            ? updateGlobalSubject(
                subject,
                { name: effect.name },
                { usedInPublished, now },
              )
            : effect.kind === 'SET_WORKLOAD'
              ? updateGlobalSubject(subject, effect.workload, {
                  usedInPublished,
                  now,
                })
              : setEquivalences(subject, effect.equivalences, now)
        await repos.subjects.update(updated)
        await repos.audit.record({
          id: this.editor.ids.next(),
          actorId: actor.userId,
          entity: 'subject',
          entityId: subject.id,
          action: `subject.${effect.kind.toLowerCase()}`,
          changes: { code: effect.code, importId, key },
          createdAt: now,
        })
      }

      await repos.imports.update({
        ...record,
        reviewPoints: record.reviewPoints.map((item) =>
          item.key === key ? resolved : item,
        ),
      })
      const { curriculum, course } = await this.editor.load(
        repos,
        actor,
        record.curriculumId,
      )
      return this.editor.managedView(repos, curriculum, course)
    })
  }
}
