import { collectCodes } from '@ufc-flow/academic-core'
import { Inject, Injectable } from '@nestjs/common'
import type { ManagedCurriculum } from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import type { Course } from '../domain/course'
import type { Curriculum, EditContext } from '../domain/curriculum'
import { CatalogErrors } from '../domain/errors'
import {
  CATALOG_UOW,
  type CatalogRepositories,
  type CatalogUnitOfWork,
} from '../domain/ports'
import { checkPublication } from '../domain/publication-check'
import { toCurriculumDetail, toReviewPointView } from './views'

export type EditTools = EditContext & {
  repos: CatalogRepositories
  now: Date
  newId: () => string
  actorId: string
}

// O que todo caso de uso de edição de EC faz igual: carrega o agregado,
// confere a permissão (moderador do curso ou admin), descobre se já há
// matrícula, grava e audita mudança em EC publicada.
@Injectable()
export class CurriculumEditor {
  constructor(
    @Inject(CATALOG_UOW) readonly uow: CatalogUnitOfWork,
    @Inject(CLOCK) readonly clock: Clock,
    @Inject(ID_GENERATOR) readonly ids: IdGenerator,
  ) {}

  async load(
    repos: CatalogRepositories,
    actor: Actor,
    curriculumId: string,
  ): Promise<{ curriculum: Curriculum; course: Course }> {
    const curriculum = await repos.curricula.findById(curriculumId)
    if (!curriculum) throw CatalogErrors.curriculumNotFound()
    if (!AccessPolicy.canManageCurricula(actor, curriculum.courseId)) {
      throw CatalogErrors.accessDenied()
    }
    const course = await repos.courses.findById(curriculum.courseId)
    if (!course) throw CatalogErrors.courseNotFound()
    return { curriculum, course }
  }

  async isLocked(repos: CatalogRepositories, c: Curriculum): Promise<boolean> {
    if (c.status !== 'PUBLISHED') return false
    return (await repos.enrollments.countForCurriculum(c.id)) > 0
  }

  async managedView(
    repos: CatalogRepositories,
    c: Curriculum,
    course: Course,
  ): Promise<ManagedCurriculum> {
    const subjects = await repos.subjects.findByIds(
      c.subjects.map((item) => item.subjectId),
    )
    const cited = c.subjects.flatMap((item) => [
      ...collectCodes(item.prerequisites),
      ...collectCodes(item.corequisites),
    ])
    const known = await repos.subjects.findByCodes([...new Set(cited)])
    const latest = await repos.imports.latestApplied(c.id)
    const reviewPoints = latest?.reviewPoints ?? []
    return {
      ...toCurriculumDetail(c, course, subjects),
      locked: await this.isLocked(repos, c),
      reviewPoints: reviewPoints.map(toReviewPointView),
      publicationCheck: checkPublication(c, {
        knownCodes: new Set(known.keys()),
        reviewPoints,
      }),
    }
  }

  async audit(
    repos: CatalogRepositories,
    c: Curriculum,
    actorId: string,
    action: string,
    changes: Record<string, unknown>,
  ) {
    await repos.audit.record({
      id: this.ids.next(),
      actorId,
      entity: 'curriculum',
      entityId: c.id,
      action,
      changes,
      createdAt: this.clock.now(),
    })
  }

  // Aplica uma mudança e devolve a EC atualizada. Toda alteração em EC
  // publicada vai para audit_logs.
  edit(
    actor: Actor,
    curriculumId: string,
    action: string,
    change: (
      c: Curriculum,
      tools: EditTools,
    ) => Promise<Curriculum> | Curriculum,
    changes: Record<string, unknown> = {},
  ): Promise<ManagedCurriculum> {
    return this.uow.run(async (repos) => {
      const { curriculum, course } = await this.load(repos, actor, curriculumId)
      const now = this.clock.now()
      const actorId = actor.userId as string
      const next = await change(curriculum, {
        locked: await this.isLocked(repos, curriculum),
        repos,
        now,
        newId: () => this.ids.next(),
        actorId,
      })
      const saved = { ...next, updatedAt: now }
      await repos.curricula.save(saved)
      if (curriculum.status === 'PUBLISHED') {
        await this.audit(repos, saved, actorId, `curriculum.${action}`, changes)
      }
      return this.managedView(repos, saved, course)
    })
  }
}
