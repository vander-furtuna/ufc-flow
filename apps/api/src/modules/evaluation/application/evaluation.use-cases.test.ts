import { describe, expect, it } from 'vitest'

import type { Actor } from '../../../shared/domain/access-policy'
import type { DomainError } from '../../../shared/domain/domain-error'
import {
  SequentialIds,
  SteppingClock,
} from '../../catalog/application/testing/in-memory-catalog'
import {
  DiscardUserEvaluationsUseCase,
  EvaluationCriteriaUseCase,
  SubjectEvaluationsUseCase,
} from './evaluation.use-cases'
import { InMemoryEvaluation } from './testing/in-memory-evaluation'

const actor = (userId: string, overrides: Partial<Actor> = {}): Actor => ({
  userId,
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(),
  ...overrides,
})
const ADMIN = actor('admin', { isAdmin: true })

function setup(requireInstitutionalEmail = false) {
  const store = new InMemoryEvaluation()
  store.subjects = [
    { id: 's1', code: 'ECO0005', name: 'Introdução à Engenharia' },
  ]
  store.criteria = [
    {
      id: 'c1',
      key: 'formacao',
      label: 'Contribuição',
      description: null,
      lowLabel: 'pouca',
      highLabel: 'muita',
      isActive: true,
      position: 0,
    },
    {
      id: 'c2',
      key: 'carga',
      label: 'Carga',
      description: null,
      lowLabel: 'leve',
      highLabel: 'pesada',
      isActive: true,
      position: 1,
    },
  ]
  const ids = new SequentialIds()
  const clock = new SteppingClock('2026-11-04T12:00:00.000Z')
  return {
    store,
    evaluations: new SubjectEvaluationsUseCase(store, clock, ids, {
      requireInstitutionalEmail,
    }),
    criteria: new EvaluationCriteriaUseCase(store, ids),
    discard: new DiscardUserEvaluationsUseCase(store, clock, ids),
  }
}

const both = (a: number, b: number) => ({
  scores: [
    { criterionId: 'c1', score: a },
    { criterionId: 'c2', score: b },
  ],
})

const code = async (work: Promise<unknown>) => {
  try {
    await work
  } catch (error) {
    return (error as DomainError).code
  }
  return null
}

describe('avaliar', () => {
  it('só quem foi aprovado ou reprovado; uma por pessoa, editável', async () => {
    const { store, evaluations } = setup()
    store.records.push(
      {
        userId: 'ana',
        subjectId: 's1',
        status: 'APROVADO',
        termCode: '2023.1',
      },
      {
        userId: 'bia',
        subjectId: 's1',
        status: 'TRANCADA',
        termCode: '2023.1',
      },
    )
    expect(
      await code(evaluations.save(actor('bia'), 'ECO0005', both(5, 3))),
    ).toBe('EVALUATION_NOT_ELIGIBLE')
    expect(
      await code(
        evaluations.save(actor('ana'), 'ECO0005', {
          scores: [{ criterionId: 'c1', score: 5 }],
        }),
      ),
    ).toBe('EVALUATION_INCOMPLETE')
    const first = await evaluations.save(actor('ana'), 'ECO0005', both(5, 3))
    expect(first).toMatchObject({
      eligibility: { eligible: true, status: 'APROVADO', term: '2023.1' },
      scores: both(5, 3).scores,
    })
    await evaluations.save(actor('ana'), 'ECO0005', both(4, 2))
    expect(store.evaluations).toHaveLength(1)
    expect((await evaluations.mine('ana', 'ECO0005')).scores).toEqual(
      both(4, 2).scores,
    )
    expect(
      (await evaluations.mine('bia', 'ECO0005')).eligibility.eligible,
    ).toBe(false)
    expect(await code(evaluations.summary('XYZ0001'))).toBe('SUBJECT_NOT_FOUND')
  })

  it('médias só a partir de 5 avaliações, sem expor quem avaliou', async () => {
    const { store, evaluations } = setup()
    for (const [index, user] of ['a', 'b', 'c', 'd', 'e'].entries()) {
      store.records.push({
        userId: user,
        subjectId: 's1',
        status: 'APROVADO',
        termCode: '2024.1',
      })
      await evaluations.save(actor(user), 'ECO0005', both(5 - (index % 2), 2))
      const summary = await evaluations.summary('ECO0005')
      expect(summary.enough).toBe(index === 4)
    }
    const summary = await evaluations.summary('ECO0005')
    expect(summary).toMatchObject({
      subject: { code: 'ECO0005' },
      total: 5,
      criteria: [
        { key: 'formacao', mean: 4.6, count: 5, distribution: [0, 0, 0, 2, 3] },
        { key: 'carga', mean: 2, count: 5 },
      ],
    })
    expect(JSON.stringify(summary)).not.toContain('"a"')
  })

  it('com a exigência ligada, só e-mail institucional avalia', async () => {
    const { store, evaluations } = setup(true)
    store.records.push(
      {
        userId: 'ana',
        subjectId: 's1',
        status: 'APROVADO',
        termCode: '2023.1',
      },
      {
        userId: 'bia',
        subjectId: 's1',
        status: 'APROVADO',
        termCode: '2023.1',
      },
    )
    store.emails.set('ana', 'ana@alu.ufc.br').set('bia', 'bia@gmail.com')
    await evaluations.save(actor('ana'), 'ECO0005', both(5, 3))
    expect(
      await code(evaluations.save(actor('bia'), 'ECO0005', both(5, 3))),
    ).toBe('EVALUATION_INSTITUTIONAL_EMAIL_REQUIRED')
    expect(
      (await evaluations.mine('bia', 'ECO0005')).eligibility,
    ).toMatchObject({
      eligible: false,
      requiresInstitutionalEmail: true,
    })
  })
})

describe('critérios', () => {
  it('admin cria no fim, edita, desativa e reordena; chave única', async () => {
    const { criteria, evaluations, store } = setup()
    expect(await code(criteria.list(actor('ana')))).toBe('ACCESS_DENIED')
    const created = await criteria.save(ADMIN, null, {
      key: 'pratica',
      label: 'Aplicação prática',
      description: null,
      lowLabel: 'pouca',
      highLabel: 'muita',
      isActive: true,
    })
    expect(created.position).toBe(2)
    expect(
      await code(
        criteria.save(ADMIN, null, {
          ...created,
          key: 'carga',
          description: null,
        }),
      ),
    ).toBe('EVALUATION_CRITERION_KEY_TAKEN')
    await criteria.save(ADMIN, 'c2', {
      key: 'carga',
      label: 'Carga',
      description: null,
      lowLabel: 'leve',
      highLabel: 'pesada',
      isActive: false,
    })
    // Desativado sai do resumo e do formulário
    expect(
      (await evaluations.summary('ECO0005')).criteria.map((c) => c.key),
    ).toEqual(['formacao', 'pratica'])
    const ordered = await criteria.reorder(ADMIN, {
      ids: [created.id, 'c2', 'c1'],
    })
    expect(ordered.map((item) => item.key)).toEqual([
      'pratica',
      'carga',
      'formacao',
    ])
    expect(await code(criteria.reorder(ADMIN, { ids: ['c1'] }))).toBe(
      'EVALUATION_ORDER_MISMATCH',
    )
    expect(store.criteria).toHaveLength(3)
    expect(
      await code(
        criteria.save(ADMIN, 'nada', { ...created, description: null }),
      ),
    ).toBe('EVALUATION_CRITERION_NOT_FOUND')
  })
})

describe('descarte pelo admin', () => {
  const evaluation = (id: string, userId: string) => ({
    id,
    userId,
    subjectId: 's1',
    scores: [{ criterionId: 'c1', score: 1 }],
    createdAt: new Date('2026-11-01T12:00:00Z'),
    updatedAt: new Date('2026-11-01T12:00:00Z'),
  })

  it('apaga as avaliações da conta, audita e devolve quantas saíram', async () => {
    const s = setup()
    s.store.emails.set('suspeito', 'x@alu.ufc.br')
    s.store.evaluations = [
      evaluation('e1', 'suspeito'),
      evaluation('e2', 'suspeito'),
      evaluation('e3', 'outra'),
    ]
    expect(await s.discard.execute(ADMIN, 'suspeito')).toEqual({
      discarded: 2,
    })
    expect(s.store.evaluations.map((item) => item.id)).toEqual(['e3'])
    expect(s.store.auditEntries).toEqual([
      {
        action: 'evaluations.discarded',
        entityId: 'suspeito',
        changes: { discarded: 2 },
      },
    ])
  })

  it('sem avaliações, nada a auditar', async () => {
    const s = setup()
    s.store.emails.set('ana', 'ana@alu.ufc.br')
    expect(await s.discard.execute(ADMIN, 'ana')).toEqual({ discarded: 0 })
    expect(s.store.auditEntries).toEqual([])
  })

  it('só admin, e a conta precisa existir', async () => {
    const s = setup()
    expect(await code(s.discard.execute(actor('ana'), 'ana'))).toBe(
      'ACCESS_DENIED',
    )
    expect(await code(s.discard.execute(ADMIN, 'ninguem'))).toBe(
      'USER_NOT_FOUND',
    )
  })
})
