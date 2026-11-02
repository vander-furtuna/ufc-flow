import { Inject, Injectable } from '@nestjs/common'
import type {
  AddCurriculumSubjectInput,
  BranchInput,
  BranchSubjectsInput,
  CreateCurriculumInput,
  CurriculumImportV1,
  CurriculumSubjectInput,
  ManagedCurriculum,
  UpdateCurriculumInput,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import {
  addSubject,
  createBranch,
  markCurrent,
  publish,
  removeBranch,
  removeSubject,
  setBranchSubjects,
  updateBranch,
  updateHeader,
  updateSubject,
  type Curriculum,
} from '../domain/curriculum'
import { CatalogErrors } from '../domain/errors'
import { newSubject } from '../domain/subject'
import { CurriculumEditor } from './curriculum-editor'
import { exportCurriculum } from './views'

// EC na área de gestão, inclusive rascunho
@Injectable()
export class GetManagedCurriculumUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string): Promise<ManagedCurriculum> {
    return this.editor.uow.run(async (repos) => {
      const { curriculum, course } = await this.editor.load(repos, actor, id)
      return this.editor.managedView(repos, curriculum, course)
    })
  }
}

// EC criada à mão, sem importação: nasce rascunho e vazia
@Injectable()
export class CreateCurriculumUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(
    actor: Actor,
    courseId: string,
    input: CreateCurriculumInput,
  ): Promise<ManagedCurriculum> {
    if (!AccessPolicy.canManageCurricula(actor, courseId)) {
      throw CatalogErrors.accessDenied()
    }
    return this.editor.uow.run(async (repos) => {
      const course = await repos.courses.findById(courseId)
      if (!course) throw CatalogErrors.courseNotFound()
      if (await repos.curricula.findBySlug(courseId, input.slug)) {
        throw CatalogErrors.curriculumSlugTaken()
      }
      const now = this.editor.clock.now()
      const curriculum: Curriculum = {
        id: this.editor.ids.next(),
        courseId,
        header: input,
        status: 'DRAFT',
        isCurrent: false,
        needsReimport: false,
        publishedAt: null,
        publishedBy: null,
        createdAt: now,
        updatedAt: now,
        branches: [],
        subjects: [],
      }
      await repos.curricula.save(curriculum)
      return this.editor.managedView(repos, curriculum, course)
    })
  }
}

@Injectable()
export class UpdateCurriculumUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string, input: UpdateCurriculumInput) {
    return this.editor.edit(
      actor,
      id,
      'header_updated',
      async (c, tools) => {
        if (input.slug !== undefined && input.slug !== c.header.slug) {
          const other = await tools.repos.curricula.findBySlug(
            c.courseId,
            input.slug,
          )
          if (other) throw CatalogErrors.curriculumSlugTaken()
        }
        return updateHeader(c, input, tools)
      },
      { changes: input },
    )
  }
}

// Disciplina nova na EC. Se o código ainda não existe no catálogo, os dados
// da disciplina global vêm junto.
@Injectable()
export class AddCurriculumSubjectUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string, input: AddCurriculumSubjectInput) {
    const { code, subject: data, ...changes } = input
    return this.editor.edit(
      actor,
      id,
      'subject_added',
      async (c, tools) => {
        let subject = (await tools.repos.subjects.findByCodes([code])).get(code)
        if (!subject) {
          if (!data) throw CatalogErrors.newSubjectRequired(code)
          subject = newSubject({ id: tools.newId(), code, ...data }, tools.now)
          await tools.repos.subjects.insertMany([subject])
        }
        return addSubject(c, {
          id: tools.newId(),
          subjectId: subject.id,
          code,
          ...changes,
        })
      },
      { code, ...changes },
    )
  }
}

@Injectable()
export class UpdateCurriculumSubjectUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(
    actor: Actor,
    id: string,
    code: string,
    input: CurriculumSubjectInput,
  ) {
    return this.editor.edit(
      actor,
      id,
      'subject_updated',
      (c, tools) => updateSubject(c, code, input, tools),
      { code, after: input },
    )
  }
}

@Injectable()
export class RemoveCurriculumSubjectUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string, code: string) {
    return this.editor.edit(
      actor,
      id,
      'subject_removed',
      (c, tools) => removeSubject(c, code, tools),
      { code },
    )
  }
}

@Injectable()
export class CreateBranchUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string, input: BranchInput) {
    return this.editor.edit(
      actor,
      id,
      'branch_created',
      (c, tools) =>
        createBranch(c, { ...input, id: tools.newId(), position: 0 }),
      { branch: input },
    )
  }
}

@Injectable()
export class UpdateBranchUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string, branchId: string, input: BranchInput) {
    return this.editor.edit(
      actor,
      id,
      'branch_updated',
      (c, tools) => updateBranch(c, branchId, input, tools),
      { branchId, after: input },
    )
  }
}

@Injectable()
export class RemoveBranchUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string, branchId: string) {
    return this.editor.edit(
      actor,
      id,
      'branch_removed',
      (c, tools) => removeBranch(c, branchId, tools),
      { branchId },
    )
  }
}

// Modo "vincular à vertente" do Admin-EC
@Injectable()
export class SetBranchSubjectsUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(
    actor: Actor,
    id: string,
    branchId: string,
    input: BranchSubjectsInput,
  ) {
    return this.editor.edit(
      actor,
      id,
      'branch_subjects_set',
      (c, tools) => setBranchSubjects(c, branchId, input.subjects, tools),
      { branchId, subjects: input.subjects },
    )
  }
}

// Roda a checagem e publica; erro na checagem barra
@Injectable()
export class PublishCurriculumUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string): Promise<ManagedCurriculum> {
    return this.editor.uow.run(async (repos) => {
      const { curriculum, course } = await this.editor.load(repos, actor, id)
      const view = await this.editor.managedView(repos, curriculum, course)
      const now = this.editor.clock.now()
      const actorId = actor.userId as string
      const published = {
        ...publish(curriculum, view.publicationCheck, { userId: actorId, now }),
        updatedAt: now,
      }
      await repos.curricula.save(published)
      await this.editor.audit(
        repos,
        published,
        actorId,
        'curriculum.published',
        {
          warnings: view.publicationCheck.warnings.length,
        },
      )
      return this.editor.managedView(repos, published, course)
    })
  }
}

// Marca como vigente e desmarca a anterior do curso, na mesma transação
@Injectable()
export class MarkCurrentCurriculumUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string): Promise<ManagedCurriculum> {
    return this.editor.uow.run(async (repos) => {
      const { curriculum, course } = await this.editor.load(repos, actor, id)
      const current = markCurrent(curriculum)
      await repos.curricula.setCurrent(course.id, current.id)
      await this.editor.audit(
        repos,
        current,
        actor.userId as string,
        'curriculum.marked_current',
        {},
      )
      return this.editor.managedView(repos, current, course)
    })
  }
}

// Só rascunho sai; EC publicada continua válida para quem está nela
@Injectable()
export class DeleteCurriculumUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string): Promise<void> {
    return this.editor.uow.run(async (repos) => {
      const { curriculum } = await this.editor.load(repos, actor, id)
      if (curriculum.status === 'PUBLISHED') {
        throw CatalogErrors.alreadyPublished()
      }
      await repos.curricula.delete(id)
    })
  }
}

// EC no formato CurriculumImportV1 (botão "Exportar JSON")
@Injectable()
export class ExportCurriculumUseCase {
  constructor(
    @Inject(CurriculumEditor) private readonly editor: CurriculumEditor,
  ) {}

  execute(actor: Actor, id: string): Promise<CurriculumImportV1> {
    return this.editor.uow.run(async (repos) => {
      const { curriculum, course } = await this.editor.load(repos, actor, id)
      const campus = await repos.campuses.findById(course.campusId)
      if (!campus) throw CatalogErrors.courseNotFound()
      const sigaa = await repos.sigaaCourses.find(course.sigaaId)
      return exportCurriculum(curriculum, {
        course,
        campus,
        sigaaCourseName: sigaa?.name ?? null,
        subjects: await repos.subjects.findByIds(
          curriculum.subjects.map((item) => item.subjectId),
        ),
        now: this.editor.clock.now(),
      })
    })
  }
}
