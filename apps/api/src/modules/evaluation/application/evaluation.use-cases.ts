import { Inject, Injectable } from '@nestjs/common'
import type {
  DiscardedEvaluations,
  EvaluationCriteriaOrder,
  EvaluationCriterion,
  EvaluationInput,
  MyEvaluation,
  ParsedEvaluationCriterionInput,
  SubjectEvaluationSummary,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { EvaluationErrors } from '../domain/errors'
import {
  assertScores,
  eligibilityOf,
  isInstitutionalEmail,
  summarize,
  type Criterion,
} from '../domain/evaluation'
import {
  EVALUATION_SETTINGS,
  EVALUATION_UOW,
  type EvaluationRepositories,
  type EvaluationSettings,
  type EvaluationUnitOfWork,
} from '../domain/ports'

const byPosition = (a: Criterion, b: Criterion) => a.position - b.position

// Admin descarta as avaliações de uma conta suspeita (identidade não
// verificada, Lacunas e riscos). As médias se recalculam na leitura.
@Injectable()
export class DiscardUserEvaluationsUseCase {
  constructor(
    @Inject(EVALUATION_UOW) private readonly uow: EvaluationUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(actor: Actor, userId: string): Promise<DiscardedEvaluations> {
    if (!AccessPolicy.canAdministerPlatform(actor)) {
      throw EvaluationErrors.accessDenied()
    }
    return this.uow.run(async (repos) => {
      if ((await repos.directory.email(userId)) === null) {
        throw EvaluationErrors.userNotFound()
      }
      const discarded = await repos.evaluations.deleteAllOf(userId)
      if (discarded > 0) {
        await repos.audit.record({
          id: this.ids.next(),
          actorId: actor.userId,
          action: 'evaluations.discarded',
          entityId: userId,
          changes: { discarded },
          createdAt: this.clock.now(),
        })
      }
      return { discarded }
    })
  }
}

async function subjectOf(repos: EvaluationRepositories, code: string) {
  const subject = await repos.directory.subjectByCode(code)
  if (!subject) throw EvaluationErrors.subjectNotFound()
  return subject
}

@Injectable()
export class SubjectEvaluationsUseCase {
  constructor(
    @Inject(EVALUATION_UOW) private readonly uow: EvaluationUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(EVALUATION_SETTINGS) private readonly settings: EvaluationSettings,
  ) {}

  // Resumo público: médias e distribuição só a partir de 5 respostas
  summary(code: string): Promise<SubjectEvaluationSummary> {
    return this.uow.run(async (repos) => {
      const subject = await subjectOf(repos, code)
      const [criteria, { total, scores }] = await Promise.all([
        repos.criteria.list(),
        repos.reader.totals(subject.id),
      ])
      return {
        subject: { code: subject.code, name: subject.name },
        ...summarize(total, scores, criteria),
      }
    })
  }

  mine(userId: string, code: string): Promise<MyEvaluation> {
    return this.uow.run(async (repos) => {
      const subject = await subjectOf(repos, code)
      const [records, evaluation, email] = await Promise.all([
        repos.directory.records(userId, subject.id),
        repos.evaluations.findMine(userId, subject.id),
        repos.directory.email(userId),
      ])
      const eligibility = eligibilityOf(records)
      const blockedByEmail =
        this.settings.requireInstitutionalEmail &&
        !isInstitutionalEmail(email ?? '')
      return {
        eligibility: {
          ...eligibility,
          eligible: eligibility.eligible && !blockedByEmail,
          requiresInstitutionalEmail: this.settings.requireInstitutionalEmail,
        },
        scores: evaluation?.scores ?? [],
        updatedAt: evaluation?.updatedAt.toISOString() ?? null,
      }
    })
  }

  // Uma por pessoa e disciplina, editável depois
  async save(
    actor: Actor,
    code: string,
    input: EvaluationInput,
  ): Promise<MyEvaluation> {
    const userId = actor.userId
    if (!userId) throw EvaluationErrors.notEligible()
    await this.uow.run(async (repos) => {
      const subject = await subjectOf(repos, code)
      const eligibility = eligibilityOf(
        await repos.directory.records(userId, subject.id),
      )
      if (!AccessPolicy.canEvaluateSubject(actor, eligibility.eligible)) {
        throw EvaluationErrors.notEligible()
      }
      if (
        this.settings.requireInstitutionalEmail &&
        !isInstitutionalEmail((await repos.directory.email(userId)) ?? '')
      ) {
        throw EvaluationErrors.institutionalEmailRequired()
      }
      assertScores(input.scores, await repos.criteria.list())
      const now = this.clock.now()
      const existing = await repos.evaluations.findMine(userId, subject.id)
      await repos.evaluations.save({
        id: existing?.id ?? this.ids.next(),
        userId,
        subjectId: subject.id,
        scores: input.scores,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
    })
    return this.mine(userId, code)
  }
}

@Injectable()
export class EvaluationCriteriaUseCase {
  constructor(
    @Inject(EVALUATION_UOW) private readonly uow: EvaluationUnitOfWork,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  private assertAdmin(actor: Actor) {
    if (!AccessPolicy.canAdministerPlatform(actor)) {
      throw EvaluationErrors.accessDenied()
    }
  }

  async list(actor: Actor): Promise<EvaluationCriterion[]> {
    this.assertAdmin(actor)
    return this.uow.run(async (repos) =>
      (await repos.criteria.list()).sort(byPosition),
    )
  }

  async save(
    actor: Actor,
    id: string | null,
    input: ParsedEvaluationCriterionInput,
  ): Promise<EvaluationCriterion> {
    this.assertAdmin(actor)
    return this.uow.run(async (repos) => {
      const current = id ? await repos.criteria.findById(id) : null
      if (id && !current) throw EvaluationErrors.criterionNotFound()
      if (await repos.criteria.keyTaken(input.key, id)) {
        throw EvaluationErrors.keyTaken()
      }
      const all = await repos.criteria.list()
      const criterion: Criterion = {
        id: current?.id ?? this.ids.next(),
        ...input,
        // O novo vai para o fim
        position:
          current?.position ??
          all.reduce((max, item) => Math.max(max, item.position + 1), 0),
      }
      await repos.criteria.save(criterion)
      return criterion
    })
  }

  // Ordem em lote: todos os critérios, uma vez cada
  async reorder(
    actor: Actor,
    input: EvaluationCriteriaOrder,
  ): Promise<EvaluationCriterion[]> {
    this.assertAdmin(actor)
    return this.uow.run(async (repos) => {
      const all = await repos.criteria.list()
      const ids = new Set(input.ids)
      if (
        ids.size !== input.ids.length ||
        ids.size !== all.length ||
        all.some((item) => !ids.has(item.id))
      ) {
        throw EvaluationErrors.orderMismatch()
      }
      const ordered = input.ids.map((itemId, position) => ({
        ...all.find((item) => item.id === itemId)!,
        position,
      }))
      for (const item of ordered) await repos.criteria.save(item)
      return ordered
    })
  }
}
