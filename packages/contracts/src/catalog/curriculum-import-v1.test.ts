import { describe, expect, it } from 'vitest'

import {
  curriculumImportV1Schema,
  type CurriculumImportV1,
} from './curriculum-import-v1'

const subject = (
  code: string,
  overrides: Partial<CurriculumImportV1['subjects'][number]> = {},
): CurriculumImportV1['subjects'][number] => ({
  code,
  name: `Disciplina ${code}`,
  type: 'DISCIPLINE',
  semester: 1,
  workloadHours: 64,
  theoryHours: 64,
  labHours: 0,
  eadHours: 0,
  extensionHours: 0,
  credits: 4,
  nature: 'MANDATORY',
  prerequisites: null,
  corequisites: null,
  equivalences: null,
  branches: [],
  ...overrides,
})

const validImport = (): CurriculumImportV1 => ({
  schemaVersion: 1,
  source: {
    extractedAt: '2026-11-01T14:00:00Z',
    url: 'https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf',
  },
  course: { sigaaId: '657484', name: 'Engenharia de Computação' },
  curriculum: {
    period: '2006.2',
    city: 'Sobral',
    minTotalHours: 3648,
    maxTotalHours: null,
    mandatoryHours: 2752,
    optativeHours: 896,
    extensionHours: 0,
    complementaryActivityHours: 560,
    maxFreeOptativeHours: 320,
    minPeriods: 7,
    avgPeriods: 10,
    maxPeriods: 15,
    periodMinHours: 64,
    periodAvgHours: 528,
    periodMaxHours: 640,
  },
  branches: [
    {
      key: 'emphasis-sistemas',
      parentKey: null,
      type: 'EMPHASIS',
      name: 'Sistemas',
      description: null,
      color: '#0891b2',
      minHours: 128,
      minComponents: null,
    },
    {
      key: 'group-redes',
      parentKey: 'emphasis-sistemas',
      type: 'SPECIFIC_GROUP',
      name: 'Redes',
      description: 'Grupo de redes',
      color: null,
      minHours: null,
      minComponents: 2,
    },
  ],
  subjects: [
    subject('SBL0080'),
    subject('SBL0056', {
      semester: 2,
      prerequisites: {
        kind: 'or',
        items: [
          { kind: 'subject', code: 'SBL0080' },
          { kind: 'subject', code: 'EEL0072' },
        ],
      },
      equivalences: { kind: 'subject', code: 'CEC0058' },
    }),
    subject('ECO0001', {
      semester: null,
      nature: 'OPTATIVE',
      branches: [{ key: 'group-redes', nature: 'OPTATIVE' }],
    }),
  ],
})

const issuesOf = (value: unknown) => {
  const result = curriculumImportV1Schema.safeParse(value)
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path,
    code: 'params' in issue ? issue.params?.code : undefined,
  }))
}

describe('curriculumImportV1Schema', () => {
  it('aceita uma importação completa', () => {
    const value = validImport()
    expect(curriculumImportV1Schema.parse(value)).toEqual(value)
  })

  it('exige schemaVersion 1', () => {
    expect(issuesOf({ ...validImport(), schemaVersion: 2 })[0]?.path).toEqual([
      'schemaVersion',
    ])
  })

  it('recusa campos desconhecidos, para pegar erro de digitação', () => {
    const value = { ...validImport(), extra: true }
    expect(curriculumImportV1Schema.safeParse(value).success).toBe(false)
  })

  it('valida o termo e as cargas da EC', () => {
    const value = validImport()
    value.curriculum.period = '2006.3'
    value.curriculum.mandatoryHours = -1
    expect(issuesOf(value).map((issue) => issue.path)).toEqual([
      ['curriculum', 'period'],
      ['curriculum', 'mandatoryHours'],
    ])
  })

  it('exige o id do curso no SIGAA só com dígitos', () => {
    const value = validImport()
    value.course.sigaaId = 'ECO-1'
    expect(issuesOf(value)[0]?.path).toEqual(['course', 'sigaaId'])
  })

  it('recusa requisito fora da forma normalizada, com o caminho', () => {
    const value = validImport()
    value.subjects[1]!.prerequisites = {
      kind: 'or',
      items: [{ kind: 'subject', code: 'SBL0080' }],
    }
    expect(issuesOf(value)[0]?.path).toEqual([
      'subjects',
      1,
      'prerequisites',
      'items',
    ])
  })

  describe('coerência do arquivo', () => {
    it('recusa disciplina repetida', () => {
      const value = validImport()
      value.subjects.push(subject('SBL0080'))
      expect(issuesOf(value)).toEqual([
        {
          path: ['subjects', 3, 'code'],
          code: 'CURRICULUM_IMPORT_DUPLICATE_SUBJECT',
        },
      ])
    })

    it('recusa chave de vertente repetida', () => {
      const value = validImport()
      value.branches.push({ ...value.branches[0]!, parentKey: null })
      expect(issuesOf(value)).toEqual([
        {
          path: ['branches', 2, 'key'],
          code: 'CURRICULUM_IMPORT_DUPLICATE_BRANCH',
        },
      ])
    })

    it('recusa vertente-mãe inexistente', () => {
      const value = validImport()
      value.branches[1]!.parentKey = 'emphasis-inexistente'
      expect(issuesOf(value)).toEqual([
        {
          path: ['branches', 1, 'parentKey'],
          code: 'CURRICULUM_IMPORT_UNKNOWN_BRANCH',
        },
      ])
    })

    it('recusa vertente de disciplina inexistente ou repetida', () => {
      const value = validImport()
      value.subjects[2]!.branches = [
        { key: 'group-redes', nature: 'OPTATIVE' },
        { key: 'group-redes', nature: 'MANDATORY' },
        { key: 'group-outro', nature: 'OPTATIVE' },
      ]
      expect(issuesOf(value)).toEqual([
        {
          path: ['subjects', 2, 'branches', 1, 'key'],
          code: 'CURRICULUM_IMPORT_DUPLICATE_BRANCH',
        },
        {
          path: ['subjects', 2, 'branches', 2, 'key'],
          code: 'CURRICULUM_IMPORT_UNKNOWN_BRANCH',
        },
      ])
    })

    it('recusa ciclo entre vertentes', () => {
      const value = validImport()
      value.branches[0]!.parentKey = 'group-redes'
      expect(issuesOf(value)).toEqual([
        {
          path: ['branches', 0, 'parentKey'],
          code: 'CURRICULUM_IMPORT_BRANCH_CYCLE',
        },
        {
          path: ['branches', 1, 'parentKey'],
          code: 'CURRICULUM_IMPORT_BRANCH_CYCLE',
        },
      ])
    })

    it('recusa vertente que é mãe de si mesma', () => {
      const value = validImport()
      value.branches[0]!.parentKey = 'emphasis-sistemas'
      expect(issuesOf(value)).toEqual([
        {
          path: ['branches', 0, 'parentKey'],
          code: 'CURRICULUM_IMPORT_BRANCH_CYCLE',
        },
      ])
    })
  })
})
