import { Inject, Injectable } from '@nestjs/common'
import type {
  ActivityCategoryInput,
  ActivityCategoryView,
  ActivityRecordInput,
  ActivityRecordView,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { FilesErrors } from '../../files/domain/errors'
import {
  attachFile,
  checkAttachable,
  markDeleted,
} from '../../files/domain/file'
import { checkActivityCategory, type Activity } from '../domain/activity'
import { AcademicRecordErrors } from '../domain/errors'
import {
  ACADEMIC_RECORD_UOW,
  type AcademicRecordRepositories,
  type AcademicRecordUnitOfWork,
} from '../domain/ports'
import { ownEnrollment, toActivityView, toCategoryView } from './views'

// Liga o certificado novo (CERTIFICATE da própria pessoa) e solta o anterior,
// que o job de limpeza apaga do disco
async function swapCertificate(
  repos: AcademicRecordRepositories,
  userId: string,
  previous: string | null,
  next: string | null,
  now: Date,
) {
  if (previous === next) return
  if (next) {
    const file = await repos.files.findById(next)
    if (!file) throw FilesErrors.fileNotFound()
    checkAttachable(file, { ownerId: userId, purpose: 'CERTIFICATE' })
    await repos.files.save(attachFile(file, now))
  }
  if (previous) {
    const file = await repos.files.findById(previous)
    if (file) await repos.files.save(markDeleted(file, now))
  }
}

async function ownActivity(
  repos: AcademicRecordRepositories,
  userId: string,
  id: string,
) {
  const activity = await repos.activities.findById(id)
  if (!activity) throw AcademicRecordErrors.activityNotFound()
  const enrollment = await repos.enrollments.findById(activity.enrollmentId)
  if (enrollment?.userId !== userId) {
    throw AcademicRecordErrors.activityNotFound()
  }
  return { activity, enrollment }
}

const fields = (input: ActivityRecordInput) => ({
  kind: input.kind,
  categoryId: input.categoryId ?? null,
  title: input.title,
  description: input.description ?? null,
  institution: input.institution ?? null,
  hours: input.hours,
  startedOn: input.startedOn,
  endedOn: input.endedOn ?? null,
  certificateFileId: input.certificateFileId ?? null,
})

@Injectable()
export class ListActivitiesUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
  ) {}

  execute(userId: string, enrollmentId: string): Promise<ActivityRecordView[]> {
    return this.uow.run(async (repos) => {
      const enrollment = await ownEnrollment(repos, userId, enrollmentId)
      const activities = await repos.activities.listByEnrollment(enrollment.id)
      return activities.map(toActivityView)
    })
  }
}

// Horas declaradas pelo aluno; a validação oficial é da coordenação
@Injectable()
export class CreateActivityUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  execute(
    userId: string,
    enrollmentId: string,
    input: ActivityRecordInput,
  ): Promise<ActivityRecordView> {
    return this.uow.run(async (repos) => {
      const enrollment = await ownEnrollment(repos, userId, enrollmentId)
      const values = fields(input)
      checkActivityCategory(
        values.categoryId,
        values.kind,
        enrollment.curriculumId,
        await repos.categories.listByCurriculum(enrollment.curriculumId),
      )
      const now = this.clock.now()
      await swapCertificate(repos, userId, null, values.certificateFileId, now)
      const activity: Activity = {
        id: this.ids.next(),
        enrollmentId: enrollment.id,
        ...values,
        createdAt: now,
        updatedAt: now,
      }
      await repos.activities.save(activity)
      return toActivityView(activity)
    })
  }
}

@Injectable()
export class UpdateActivityUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(
    userId: string,
    id: string,
    input: ActivityRecordInput,
  ): Promise<ActivityRecordView> {
    return this.uow.run(async (repos) => {
      const { activity, enrollment } = await ownActivity(repos, userId, id)
      const values = fields(input)
      checkActivityCategory(
        values.categoryId,
        values.kind,
        enrollment.curriculumId,
        await repos.categories.listByCurriculum(enrollment.curriculumId),
      )
      const now = this.clock.now()
      await swapCertificate(
        repos,
        userId,
        activity.certificateFileId,
        values.certificateFileId,
        now,
      )
      const updated: Activity = { ...activity, ...values, updatedAt: now }
      await repos.activities.save(updated)
      return toActivityView(updated)
    })
  }
}

@Injectable()
export class DeleteActivityUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(userId: string, id: string): Promise<void> {
    return this.uow.run(async (repos) => {
      const { activity } = await ownActivity(repos, userId, id)
      await repos.activities.delete(activity.id)
      await swapCertificate(
        repos,
        userId,
        activity.certificateFileId,
        null,
        this.clock.now(),
      )
    })
  }
}

// ——— Categorias por EC: moderador do curso ou admin ———

async function managedCurriculum(
  repos: AcademicRecordRepositories,
  actor: Actor,
  curriculumId: string,
) {
  const curriculum = await repos.catalog.findCurriculumById(curriculumId)
  if (!curriculum) throw AcademicRecordErrors.curriculumNotFound()
  if (!AccessPolicy.canManageCurricula(actor, curriculum.courseId)) {
    throw AcademicRecordErrors.accessDenied()
  }
  return curriculum
}

async function managedCategory(
  repos: AcademicRecordRepositories,
  actor: Actor,
  id: string,
) {
  const category = await repos.categories.findById(id)
  if (!category) throw AcademicRecordErrors.categoryNotFound()
  await managedCurriculum(repos, actor, category.curriculumId)
  return category
}

@Injectable()
export class ListActivityCategoriesUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
  ) {}

  execute(actor: Actor, curriculumId: string): Promise<ActivityCategoryView[]> {
    return this.uow.run(async (repos) => {
      await managedCurriculum(repos, actor, curriculumId)
      const categories = await repos.categories.listByCurriculum(curriculumId)
      return categories.map(toCategoryView)
    })
  }
}

@Injectable()
export class SaveActivityCategoryUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  create(
    actor: Actor,
    curriculumId: string,
    input: ActivityCategoryInput,
  ): Promise<ActivityCategoryView> {
    return this.uow.run(async (repos) => {
      await managedCurriculum(repos, actor, curriculumId)
      const category = { id: this.ids.next(), curriculumId, ...input }
      await repos.categories.save(category)
      await this.audit(repos, actor, category.id, 'CREATED', input)
      return toCategoryView(category)
    })
  }

  update(
    actor: Actor,
    id: string,
    input: ActivityCategoryInput,
  ): Promise<ActivityCategoryView> {
    return this.uow.run(async (repos) => {
      const current = await managedCategory(repos, actor, id)
      const category = { ...current, ...input }
      await repos.categories.save(category)
      await this.audit(repos, actor, id, 'UPDATED', input)
      return toCategoryView(category)
    })
  }

  // As atividades da categoria ficam, sem categoria (e sem teto)
  delete(actor: Actor, id: string): Promise<void> {
    return this.uow.run(async (repos) => {
      await managedCategory(repos, actor, id)
      await repos.categories.delete(id)
      await this.audit(repos, actor, id, 'DELETED', {})
    })
  }

  private audit(
    repos: AcademicRecordRepositories,
    actor: Actor,
    entityId: string,
    action: string,
    changes: Record<string, unknown>,
  ) {
    return repos.audit.record({
      id: this.ids.next(),
      actorId: actor.userId!,
      entity: 'activity_category',
      entityId,
      action,
      changes,
    })
  }
}
