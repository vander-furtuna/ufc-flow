import { Inject, Injectable } from '@nestjs/common'
import type {
  CourseDetail,
  CourseSummary,
  CreateCourseInput,
  CurriculumDetail,
  SigaaCourseEntry,
  SigaaCourseRefresh,
  UpdateCourseInput,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import {
  campusForSigaaCourse,
  checkCourseDeletion,
  type Campus,
  type Course,
} from '../domain/course'
import { CatalogErrors } from '../domain/errors'
import {
  CATALOG_UOW,
  SIGAA_COURSE_SOURCE,
  type CatalogRepositories,
  type CatalogUnitOfWork,
  type SigaaCourseSource,
} from '../domain/ports'
import { ImportApplier } from './import-applier'
import { toCourseDetail, toCurriculumDetail, toSigaaCourseEntry } from './views'

async function detailOf(
  repos: CatalogRepositories,
  course: Course,
  onlyPublished: boolean,
): Promise<CourseDetail> {
  const campus = (await repos.campuses.findById(course.campusId)) as Campus
  const summaries = await repos.curricula.summaries(course.id)
  return toCourseDetail(
    course,
    campus,
    onlyPublished
      ? summaries.filter((item) => item.status === 'PUBLISHED')
      : summaries,
  )
}

function requireAdmin(actor: Actor) {
  if (!AccessPolicy.canAdministerPlatform(actor)) {
    throw CatalogErrors.accessDenied()
  }
}

// Cursos ativos (pedido de moderação, lista do web)
@Injectable()
export class ListCoursesUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(): Promise<CourseSummary[]> {
    return this.uow.run(async ({ courses }) =>
      (await courses.list())
        .filter((course) => course.isActive)
        .map(({ id, slug, name }) => ({ id, slug, name })),
    )
  }
}

@Injectable()
export class GetPublicCourseUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(slug: string): Promise<CourseDetail> {
    return this.uow.run(async (repos) => {
      const course = await repos.courses.findBySlug(slug)
      if (!course?.isActive) throw CatalogErrors.courseNotFound()
      return detailOf(repos, course, true)
    })
  }
}

// EC publicada, como o web público mostra
@Injectable()
export class GetPublicCurriculumUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(courseSlug: string, slug: string): Promise<CurriculumDetail> {
    return this.uow.run(async (repos) => {
      const course = await repos.courses.findBySlug(courseSlug)
      if (!course?.isActive) throw CatalogErrors.courseNotFound()
      const curriculum = await repos.curricula.findBySlug(course.id, slug)
      if (curriculum?.status !== 'PUBLISHED') {
        throw CatalogErrors.curriculumNotFound()
      }
      const subjects = await repos.subjects.findByIds(
        curriculum.subjects.map((item) => item.subjectId),
      )
      return toCurriculumDetail(curriculum, course, subjects)
    })
  }
}

// Catálogo do SIGAA, com o curso do Flow criado a partir de cada um
@Injectable()
export class ListSigaaCoursesUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(): Promise<SigaaCourseEntry[]> {
    return this.uow.run(async ({ sigaaCourses, courses }) => {
      const flow = new Map(
        (await courses.list()).map((course) => [course.sigaaId, course.id]),
      )
      return (await sigaaCourses.list()).map((record) =>
        toSigaaCourseEntry(record, flow.get(record.sigaaId) ?? null),
      )
    })
  }
}

// Lê a lista pública do SIGAA e atualiza sigaa_courses. Roda por agenda
// (sem ator) ou pelo botão do admin.
@Injectable()
export class RefreshSigaaCoursesUseCase {
  constructor(
    @Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SIGAA_COURSE_SOURCE) private readonly source: SigaaCourseSource,
  ) {}

  async execute(actor: Actor | null): Promise<SigaaCourseRefresh> {
    if (actor) requireAdmin(actor)
    const list = await this.source.fetchAll()
    const now = this.clock.now()
    const result = await this.uow.run(({ sigaaCourses }) =>
      sigaaCourses.sync(list, now),
    )
    return { total: list.length, ...result, refreshedAt: now.toISOString() }
  }
}

// Admin cria o curso escolhendo do catálogo do SIGAA. Importações que
// esperavam este curso viram rascunho na mesma transação.
@Injectable()
export class CreateCourseUseCase {
  constructor(
    @Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(ImportApplier) private readonly applier: ImportApplier,
  ) {}

  execute(actor: Actor, input: CreateCourseInput): Promise<CourseDetail> {
    requireAdmin(actor)
    return this.uow.run(async (repos) => {
      const sigaa = await repos.sigaaCourses.find(input.sigaaId)
      if (!sigaa) throw CatalogErrors.sigaaCourseNotFound()
      if (await repos.courses.findBySigaaId(input.sigaaId)) {
        throw CatalogErrors.courseExists()
      }
      if (await repos.courses.findBySlug(input.slug)) {
        throw CatalogErrors.courseSlugTaken()
      }

      const campusData = campusForSigaaCourse(sigaa)
      let campus = await repos.campuses.findBySlug(campusData.slug)
      if (!campus) {
        campus = { id: this.ids.next(), ...campusData }
        await repos.campuses.insert(campus)
      }
      const now = this.clock.now()
      const course: Course = {
        id: this.ids.next(),
        ...input,
        campusId: campus.id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }
      await repos.courses.insert(course)

      for (const record of await repos.imports.pendingForCourse(
        input.sigaaId,
      )) {
        const existing = await repos.curricula.findByCode(
          course.id,
          record.payload.curriculum.code,
        )
        if (existing) {
          await repos.imports.update({
            ...record,
            courseId: course.id,
            curriculumId: existing.id,
          })
        } else {
          await this.applier.apply(
            repos,
            { ...record, courseId: course.id },
            course,
          )
        }
      }
      await repos.audit.record({
        id: this.ids.next(),
        actorId: actor.userId,
        entity: 'course',
        entityId: course.id,
        action: 'course.created',
        changes: { sigaaId: course.sigaaId, slug: course.slug },
        createdAt: now,
      })
      return detailOf(repos, course, false)
    })
  }
}

@Injectable()
export class UpdateCourseUseCase {
  constructor(
    @Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(
    actor: Actor,
    id: string,
    input: UpdateCourseInput,
  ): Promise<CourseDetail> {
    requireAdmin(actor)
    return this.uow.run(async (repos) => {
      const course = await repos.courses.findById(id)
      if (!course) throw CatalogErrors.courseNotFound()
      if (input.slug !== undefined && input.slug !== course.slug) {
        if (await repos.courses.findBySlug(input.slug)) {
          throw CatalogErrors.courseSlugTaken()
        }
      }
      const defined = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
      )
      const updated = { ...course, ...defined, updatedAt: this.clock.now() }
      await repos.courses.update(updated)
      return detailOf(repos, updated, false)
    })
  }
}

// Excluir só sem EC publicada; rascunhos vão junto
@Injectable()
export class DeleteCourseUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(actor: Actor, id: string): Promise<void> {
    requireAdmin(actor)
    return this.uow.run(async (repos) => {
      const course = await repos.courses.findById(id)
      if (!course) throw CatalogErrors.courseNotFound()
      const summaries = await repos.curricula.summaries(id)
      checkCourseDeletion(
        summaries.filter((item) => item.status === 'PUBLISHED').length,
      )
      await repos.courses.delete(id)
    })
  }
}

// Cursos que a pessoa gerencia (admin: todos), com os rascunhos
@Injectable()
export class ListManagedCoursesUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(actor: Actor): Promise<CourseDetail[]> {
    if (!actor.isAdmin && actor.moderatedCourseIds.size === 0) {
      throw CatalogErrors.accessDenied()
    }
    return this.uow.run(async (repos) => {
      const courses = (await repos.courses.list()).filter((course) =>
        AccessPolicy.canManageCurricula(actor, course.id),
      )
      return Promise.all(
        courses.map((course) => detailOf(repos, course, false)),
      )
    })
  }
}
