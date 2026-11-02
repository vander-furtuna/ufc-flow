import type { RequirementExpr } from '@ufc-flow/academic-core'
import { Inject, Injectable } from '@nestjs/common'
import type { SubjectView, UpdateSubjectInput } from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { CatalogErrors } from '../domain/errors'
import {
  CATALOG_UOW,
  type CatalogRepositories,
  type CatalogUnitOfWork,
} from '../domain/ports'
import {
  setEquivalences,
  updateGlobalSubject,
  type Subject,
} from '../domain/subject'
import { toSubjectView } from './views'

async function findSubject(repos: CatalogRepositories, code: string) {
  const subject = (await repos.subjects.findByCodes([code])).get(code)
  if (!subject) throw CatalogErrors.subjectNotFound(code)
  return subject
}

// Disciplinas do catálogo pelos códigos (leitura pública)
@Injectable()
export class ListSubjectsByCodesUseCase {
  constructor(@Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork) {}

  execute(codes: readonly string[]): Promise<SubjectView[]> {
    return this.uow.run(async ({ subjects }) =>
      [...(await subjects.findByCodes(codes)).values()]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map(toSubjectView),
    )
  }
}

// Disciplina global: afeta todos os cursos, então só admin edita aqui.
// Moderador corrige o nome pelos pontos para revisar da importação.
@Injectable()
export class UpdateSubjectUseCase {
  constructor(
    @Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  execute(
    actor: Actor,
    code: string,
    input: UpdateSubjectInput,
  ): Promise<SubjectView> {
    if (!AccessPolicy.canAdministerPlatform(actor)) {
      throw CatalogErrors.accessDenied()
    }
    return this.uow.run(async (repos) => {
      const subject = await findSubject(repos, code)
      if (input.code !== undefined && input.code !== code) {
        if ((await repos.subjects.findByCodes([input.code])).size > 0) {
          throw CatalogErrors.subjectCodeTaken(input.code)
        }
      }
      const now = this.clock.now()
      const updated = updateGlobalSubject(subject, input, {
        usedInPublished: await repos.subjects.usedInPublished(subject.id),
        now,
      })
      await repos.subjects.update(updated)
      await this.audit(repos, actor, updated, 'subject.updated', {
        before: { code: subject.code, name: subject.name },
        changes: input,
      })
      return toSubjectView(updated)
    })
  }

  async audit(
    repos: CatalogRepositories,
    actor: Actor,
    subject: Subject,
    action: string,
    changes: Record<string, unknown>,
  ) {
    await repos.audit.record({
      id: this.ids.next(),
      actorId: actor.userId,
      entity: 'subject',
      entityId: subject.id,
      action,
      changes,
      createdAt: this.clock.now(),
    })
  }
}

// Equivalências são globais: só admin, com auditoria
@Injectable()
export class SetSubjectEquivalencesUseCase {
  constructor(
    @Inject(CATALOG_UOW) private readonly uow: CatalogUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UpdateSubjectUseCase)
    private readonly updater: UpdateSubjectUseCase,
  ) {}

  execute(
    actor: Actor,
    code: string,
    equivalences: RequirementExpr | null,
  ): Promise<SubjectView> {
    if (!AccessPolicy.canAdministerPlatform(actor)) {
      throw CatalogErrors.accessDenied()
    }
    return this.uow.run(async (repos) => {
      const subject = await findSubject(repos, code)
      const updated = setEquivalences(subject, equivalences, this.clock.now())
      await repos.subjects.update(updated)
      await this.updater.audit(
        repos,
        actor,
        updated,
        'subject.equivalences_set',
        {
          before: subject.equivalences,
          after: equivalences,
        },
      )
      return toSubjectView(updated)
    })
  }
}
