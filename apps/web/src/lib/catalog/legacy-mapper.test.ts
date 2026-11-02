import type {
  CourseDetail,
  CurriculumDetail,
  CurriculumSubjectView,
} from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import { toLegacyCourse } from './legacy-mapper'

const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'
const NOW = '2026-11-01T12:00:00.000Z'

const course: CourseDetail = {
  id: ID,
  sigaaId: '657484',
  slug: 'engenharia-de-computacao-ufc-sobral',
  name: 'Engenharia de Computação',
  icon: 'cpu',
  color: null,
  isActive: true,
  campus: {
    id: ID,
    slug: 'sobral',
    name: 'Campus da UFC em Sobral',
    city: 'Sobral',
    state: 'CE',
  },
  curricula: [],
}

const subject = (
  overrides: Partial<CurriculumSubjectView>,
): CurriculumSubjectView => ({
  subjectId: ID,
  code: 'ECO0001',
  name: 'ALGORITMOS',
  type: 'DISCIPLINE',
  durationTerms: 1,
  workloadHours: 64,
  theoryHours: 48,
  labHours: 16,
  eadHours: 0,
  extensionHours: 0,
  credits: 4,
  semester: 1,
  nature: 'MANDATORY',
  prerequisites: null,
  corequisites: null,
  equivalences: null,
  branches: [],
  ...overrides,
})

const curriculum: CurriculumDetail = {
  id: ID,
  slug: '2006-2',
  code: '2006.2',
  effectiveTerm: '2006.2',
  status: 'PUBLISHED',
  isCurrent: true,
  needsReimport: false,
  publishedAt: NOW,
  updatedAt: NOW,
  course: { id: ID, slug: course.slug, name: course.name },
  header: {
    code: '2006.2',
    effectiveTerm: '2006.2',
    slug: '2006-2',
    sigaaId: null,
    matrixName: 'ENGENHARIA DE COMPUTAÇÃO - SOBRAL',
    unitName: null,
    minTotalHours: 3648,
    maxTotalHours: null,
    mandatoryHours: 2752,
    optativeHours: 896,
    extensionHours: 0,
    specificActivityHours: 560,
    maxFreeOptativeHours: 320,
    minPeriods: 7,
    avgPeriods: 10,
    maxPeriods: 15,
    periodMinHours: 64,
    periodAvgHours: 528,
    periodMaxHours: 640,
    minEmphases: null,
    maxEmphases: null,
  },
  branches: [
    {
      id: 'b-comp',
      parentId: null,
      type: 'SLOPE',
      name: 'Computação',
      description: null,
      sigaaCode: null,
      color: '#22d3ee',
      mandatoryHours: null,
      minHours: 128,
      maxHours: null,
      minComponents: null,
      maxComponents: null,
      position: 0,
    },
  ],
  subjects: [
    subject({}),
    subject({
      code: 'ECO0002',
      name: 'ESTRUTURAS DE DADOS',
      semester: 3,
      nature: 'OPTATIVE',
      prerequisites: {
        kind: 'and',
        items: [
          { kind: 'subject', code: 'ECO0001' },
          {
            kind: 'or',
            items: [
              { kind: 'subject', code: 'SBL0084' },
              { kind: 'subject', code: 'CEC0022' },
            ],
          },
        ],
      },
      corequisites: { kind: 'subject', code: 'ECO0003' },
      equivalences: { kind: 'subject', code: 'CEC0058' },
      branches: [{ branchId: 'b-comp', nature: 'MANDATORY' }],
    }),
    subject({
      code: 'ECO0090',
      type: 'INTERNSHIP',
      semester: null,
      name: 'ESTÁGIO',
    }),
    subject({ code: 'ECO0091', type: 'FINAL_PROJECT', name: 'TCC' }),
    subject({
      code: 'ECO0092',
      type: 'INTEGRATIVE_ACTIVITY',
      name: 'INTEGRADORA',
      nature: 'OPTATIVE',
    }),
  ],
}

describe('toLegacyCourse', () => {
  const legacy = toLegacyCourse(course, [curriculum])
  const structure = legacy.curriculumStructures[0]!

  it('mantém ids, slugs e o formato do front atual', () => {
    expect(legacy).toMatchObject({
      id: '657484',
      slug: 'engenharia-de-computacao-ufc-sobral',
      name: 'Engenharia de Computação',
      icon: 'cpu',
      isActive: true,
    })
    expect(legacy.color).toBeUndefined()
    expect(structure).toMatchObject({
      id: '2006.2',
      period: '2006.2',
      slug: '2006-2',
      city: 'SOBRAL - CE',
      isCurrent: true,
      minTotalHours: 3648,
      mandatoryAcademicActivityHours: 560,
      maxOptativeFreeHours: 320,
      periodHours: { min: 64, avg: 528, max: 640 },
    })
    expect(structure.maxTotalHours).toBeUndefined()
    expect(structure.branchs).toEqual([
      {
        id: 'b-comp',
        name: 'Computação',
        color: '#22d3ee',
        type: 'SLOPE',
        minHours: 128,
      },
    ])
  })

  it('achata requisitos em listas de códigos e junta natureza e tipo como antes', () => {
    const [first, second, internship, project, integrative] = structure.subjects
    expect(first).toMatchObject({
      code: 'ECO0001',
      nature: 'OBRIGATÓRIA',
      type: 'DISCIPLINA',
      duration: 64,
      slug: 'algoritmos',
      details: { aula: 48, lab: 16, ead: 0, ext: 0, cr: 4 },
      prerequisites: [],
    })
    expect(second).toMatchObject({
      nature: 'OPTATIVA',
      prerequisites: ['ECO0001', 'SBL0084', 'CEC0022'],
      corequisites: ['ECO0003'],
      equivalences: ['CEC0058'],
      branch: ['b-comp'],
      branchRelations: [{ branchId: 'b-comp', nature: 'OBRIGATÓRIA' }],
    })
    // Sem semestre vai para o último período da EC, como as optativas
    expect(internship).toMatchObject({
      nature: 'ESTÁGIO',
      type: 'ESTÁGIO',
      semester: 3,
    })
    expect(project).toMatchObject({
      nature: 'TCC',
      type: 'TRABALHO DE CONCLUSÃO DE CURSO',
    })
    expect(integrative).toMatchObject({ nature: 'OPTATIVA', type: 'OUTRO' })
  })

  it('sem branchs de cor nula ficam com a cor neutra', () => {
    const other = toLegacyCourse(course, [
      {
        ...curriculum,
        branches: [{ ...curriculum.branches[0]!, color: null, parentId: 'x' }],
      },
    ])
    expect(other.curriculumStructures[0]!.branchs[0]).toMatchObject({
      color: '#64748b',
      parentBranchId: 'x',
    })
  })
})
