import { describe, expect, it } from 'vitest'

import type { RequirementExpr } from '../requirements/types'
import { computeProgress } from './compute-progress'
import type {
  CompletedSubject,
  ProgressCurriculum,
  ProgressInput,
} from './types'

const s = (code: string): RequirementExpr => ({ kind: 'subject', code })

// EC pequena: 3 obrigatórias, 3 optativas, uma ênfase com subárea. Como no
// SIGAA, as obrigatórias incluem o componente de atividades complementares
// (ATV0001, 100 h), exigido pelas atividades lançadas (D40)
const curriculum: ProgressCurriculum = {
  mandatoryHours: 292,
  optativeHours: 128,
  maxFreeOptativeHours: 64,
  complementaryComponentCode: 'ATV0001',
  extensionHours: 50,
  minTotalHours: 470,
  subjects: [
    {
      code: 'OBR0001',
      nature: 'MANDATORY',
      workloadHours: 64,
      extensionHours: 0,
    },
    {
      code: 'OBR0002',
      nature: 'MANDATORY',
      workloadHours: 64,
      extensionHours: 16,
    },
    {
      code: 'OBR0003',
      nature: 'MANDATORY',
      workloadHours: 64,
      extensionHours: 0,
    },
    {
      code: 'ATV0001',
      nature: 'MANDATORY',
      workloadHours: 100,
      extensionHours: 0,
    },
    {
      code: 'OPT0001',
      nature: 'OPTATIVE',
      workloadHours: 64,
      extensionHours: 0,
      branchIds: ['enfase'],
    },
    {
      code: 'OPT0002',
      nature: 'OPTATIVE',
      workloadHours: 32,
      extensionHours: 0,
      branchIds: ['subarea'],
    },
    {
      code: 'OPT0003',
      nature: 'OPTATIVE',
      workloadHours: 32,
      extensionHours: 8,
      branchIds: ['subarea'],
    },
  ],
  branches: [
    { id: 'enfase', parentId: null, minHours: 128, minComponents: 3 },
    { id: 'subarea', parentId: 'enfase', minHours: 32, minComponents: null },
    { id: 'livre', parentId: null, minHours: null, minComponents: null },
  ],
  activityCategories: [
    { id: 'monitoria', kind: 'COMPLEMENTARY', maxHours: 60 },
    { id: 'eventos', kind: 'COMPLEMENTARY', maxHours: null },
    { id: 'projeto', kind: 'EXTENSION', maxHours: 30 },
  ],
}

const subject = (
  code: string,
  workloadHours: number,
  extensionHours = 0,
): CompletedSubject => ({ code, workloadHours, extensionHours })

const input = (overrides: Partial<ProgressInput> = {}): ProgressInput => ({
  curriculum,
  completedSubjects: [],
  activities: [],
  ...overrides,
})

describe('computeProgress', () => {
  it('começa zerado', () => {
    const progress = computeProgress(input())
    expect(progress.mandatory).toEqual({
      requiredHours: 192,
      completedHours: 0,
      met: false,
    })
    expect(progress.total).toEqual({
      requiredHours: 470,
      completedHours: 0,
      met: false,
    })
  })

  describe('obrigatórias', () => {
    it('soma as obrigatórias cumpridas', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [
            subject('OBR0001', 64),
            subject('OBR0002', 64, 16),
          ],
        }),
      )
      expect(progress.mandatory).toEqual({
        requiredHours: 192,
        completedHours: 128,
        met: false,
      })
    })

    it('atinge o mínimo com todas', () => {
      const progress = computeProgress(
        input({
          completedSubjects: ['OBR0001', 'OBR0002', 'OBR0003'].map((code) =>
            subject(code, 64),
          ),
        }),
      )
      expect(progress.mandatory.met).toBe(true)
    })

    it('usa a carga da EC quando a cumprida tem outra carga', () => {
      const progress = computeProgress(
        input({ completedSubjects: [subject('OBR0001', 60)] }),
      )
      expect(progress.mandatory.completedHours).toBe(64)
    })
  })

  describe('optativas e livres', () => {
    it('soma as optativas da EC', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [subject('OPT0001', 64), subject('OPT0002', 32)],
        }),
      )
      expect(progress.optative).toEqual({
        requiredHours: 128,
        completedHours: 96,
        curriculumHours: 96,
        freeHours: 0,
        freeHoursOverCap: 0,
        met: false,
      })
    })

    it('disciplina fora da EC conta como optativa livre, até o teto', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [
            subject('OPT0001', 64),
            subject('FORA001', 48),
            subject('FORA002', 48),
          ],
        }),
      )
      expect(progress.optative).toEqual({
        requiredHours: 128,
        completedHours: 128,
        curriculumHours: 64,
        freeHours: 64,
        freeHoursOverCap: 32,
        met: true,
      })
    })
  })

  describe('equivalências', () => {
    const equivalences = new Map([['OBR0001', s('EQV0001')]])

    it('a disciplina da EC é cumprida pela equivalente, com a carga da EC', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [subject('EQV0001', 60)],
          equivalences,
        }),
      )
      expect(progress.mandatory.completedHours).toBe(64)
    })

    it('a equivalente usada não conta de novo como livre', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [subject('EQV0001', 60)],
          equivalences,
        }),
      )
      expect(progress.optative.freeHours).toBe(0)
      expect(progress.total.completedHours).toBe(64)
    })
  })

  describe('vertentes', () => {
    it('conta horas e componentes de cada vertente', () => {
      const progress = computeProgress(
        input({ completedSubjects: [subject('OPT0001', 64)] }),
      )
      expect(progress.branches).toContainEqual({
        branchId: 'enfase',
        minHours: 128,
        minComponents: 3,
        maxHours: null,
        maxComponents: null,
        completedHours: 64,
        completedComponents: 1,
        met: false,
        overMax: false,
      })
    })

    it('a subárea também conta para a vertente-mãe', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [
            subject('OPT0001', 64),
            subject('OPT0002', 32),
            subject('OPT0003', 32),
          ],
        }),
      )
      expect(progress.branches).toEqual([
        {
          branchId: 'enfase',
          minHours: 128,
          minComponents: 3,
          maxHours: null,
          maxComponents: null,
          completedHours: 128,
          completedComponents: 3,
          met: true,
          overMax: false,
        },
        {
          branchId: 'subarea',
          minHours: 32,
          minComponents: null,
          maxHours: null,
          maxComponents: null,
          completedHours: 64,
          completedComponents: 2,
          met: true,
          overMax: false,
        },
        {
          branchId: 'livre',
          minHours: null,
          minComponents: null,
          maxHours: null,
          maxComponents: null,
          completedHours: 0,
          completedComponents: 0,
          met: true,
          overMax: false,
        },
      ])
    })

    it('exige o mínimo de horas e o de componentes', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [subject('OPT0001', 64), subject('OPT0002', 32)],
        }),
      )
      const enfase = progress.branches.find((b) => b.branchId === 'enfase')
      expect(enfase).toMatchObject({ completedComponents: 2, met: false })
    })
  })

  describe('ênfases e grupos (D37)', () => {
    const withEmphases: ProgressCurriculum = {
      ...curriculum,
      minEmphases: 1,
      maxEmphases: 2,
      branches: [
        {
          id: 'enfase',
          parentId: null,
          minHours: 64,
          minComponents: null,
          type: 'EMPHASIS',
        },
        {
          id: 'subarea',
          parentId: 'enfase',
          minHours: null,
          minComponents: null,
          maxComponents: 1,
          type: 'SPECIFIC_GROUP',
        },
        {
          id: 'livre',
          parentId: null,
          minHours: null,
          minComponents: null,
          type: 'SLOPE',
        },
      ],
    }

    it('conta as ênfases cumpridas contra o exigido e o permitido', () => {
      const none = computeProgress(input({ curriculum: withEmphases }))
      expect(none.emphases).toEqual({ required: 1, allowed: 2, completed: 0 })
      const one = computeProgress(
        input({
          curriculum: withEmphases,
          completedSubjects: [subject('OPT0001', 64)],
        }),
      )
      expect(one.emphases.completed).toBe(1)
    })

    it('passar do máximo do grupo vira aviso, sem cortar horas', () => {
      const progress = computeProgress(
        input({
          curriculum: withEmphases,
          completedSubjects: [subject('OPT0002', 32), subject('OPT0003', 32)],
        }),
      )
      expect(
        progress.branches.find((b) => b.branchId === 'subarea'),
      ).toMatchObject({
        maxComponents: 1,
        completedComponents: 2,
        overMax: true,
      })
      expect(progress.optative.curriculumHours).toBe(64)
    })

    it('EC sem exigência de ênfases', () => {
      expect(computeProgress(input()).emphases).toEqual({
        required: null,
        allowed: null,
        completed: 0,
      })
    })
  })

  describe('atividades complementares', () => {
    it('soma por categoria com teto', () => {
      const progress = computeProgress(
        input({
          activities: [
            { kind: 'COMPLEMENTARY', categoryId: 'monitoria', hours: 40 },
            { kind: 'COMPLEMENTARY', categoryId: 'monitoria', hours: 40 },
            { kind: 'COMPLEMENTARY', categoryId: 'eventos', hours: 30 },
            { kind: 'COMPLEMENTARY', categoryId: null, hours: 5 },
          ],
        }),
      )
      expect(progress.complementary).toEqual({
        requiredHours: 100,
        completedHours: 95,
        met: false,
        componentCompleted: false,
        byCategory: [
          { categoryId: 'monitoria', declaredHours: 80, countedHours: 60 },
          { categoryId: 'eventos', declaredHours: 30, countedHours: 30 },
          { categoryId: null, declaredHours: 5, countedHours: 5 },
        ],
      })
    })

    it('o componente de complementares sai das obrigatórias', () => {
      const progress = computeProgress(
        input({ completedSubjects: [subject('OBR0001', 64)] }),
      )
      expect(progress.mandatory).toEqual({
        requiredHours: 192,
        completedHours: 64,
        met: false,
      })
      expect(progress.complementary).toMatchObject({
        requiredHours: 100,
        componentCompleted: false,
      })
    })

    it('componente aprovado pela coordenação cumpre as complementares sem contar duas vezes', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [subject('ATV0001', 100)],
          activities: [
            { kind: 'COMPLEMENTARY', categoryId: 'eventos', hours: 30 },
          ],
        }),
      )
      expect(progress.mandatory.completedHours).toBe(0)
      expect(progress.complementary).toMatchObject({
        requiredHours: 100,
        completedHours: 100,
        componentCompleted: true,
        met: true,
      })
      expect(progress.total.completedHours).toBe(100)
    })

    it('EC sem o componente não exige complementares', () => {
      const progress = computeProgress(
        input({
          curriculum: { ...curriculum, complementaryComponentCode: null },
          activities: [
            { kind: 'COMPLEMENTARY', categoryId: 'eventos', hours: 30 },
          ],
        }),
      )
      expect(progress.complementary).toMatchObject({
        requiredHours: 0,
        completedHours: 30,
        met: true,
      })
      // Sem exigência, as atividades não entram no total
      expect(progress.total.completedHours).toBe(0)
    })

    it('no total, conta só até as horas exigidas', () => {
      const progress = computeProgress(
        input({
          activities: [
            { kind: 'COMPLEMENTARY', categoryId: 'eventos', hours: 150 },
          ],
        }),
      )
      expect(progress.complementary).toMatchObject({
        completedHours: 150,
        met: true,
      })
      expect(progress.total.completedHours).toBe(100)
    })
  })

  describe('extensão', () => {
    it('soma as horas de extensão das disciplinas e as atividades de extensão', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [
            subject('OBR0002', 64, 16),
            subject('OPT0003', 32, 8),
            subject('FORA001', 32, 4),
          ],
          activities: [
            { kind: 'EXTENSION', categoryId: 'projeto', hours: 20 },
            { kind: 'EXTENSION', categoryId: 'projeto', hours: 20 },
          ],
        }),
      )
      expect(progress.extension).toEqual({
        requiredHours: 50,
        completedHours: 58,
        fromSubjectsHours: 28,
        fromActivitiesHours: 30,
        met: true,
      })
    })
  })

  describe('total', () => {
    it('disciplinas + complementares + atividades de extensão', () => {
      const progress = computeProgress(
        input({
          completedSubjects: [
            ...['OBR0001', 'OBR0002', 'OBR0003'].map((code) =>
              subject(code, 64),
            ),
            subject('OPT0001', 64),
            subject('OPT0002', 32),
            subject('FORA001', 96),
          ],
          activities: [
            { kind: 'COMPLEMENTARY', categoryId: 'eventos', hours: 100 },
            { kind: 'EXTENSION', categoryId: 'projeto', hours: 30 },
          ],
        }),
      )
      // 192 obrigatórias + 96 da EC + 64 livres (teto) + 100 + 30
      expect(progress.total).toEqual({
        requiredHours: 470,
        completedHours: 482,
        met: true,
      })
    })

    it('as horas de extensão das disciplinas não contam duas vezes', () => {
      const progress = computeProgress(
        input({ completedSubjects: [subject('OBR0002', 64, 16)] }),
      )
      expect(progress.total.completedHours).toBe(64)
    })
  })
})
