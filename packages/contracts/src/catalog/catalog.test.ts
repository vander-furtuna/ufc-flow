import { describe, expect, it } from 'vitest'

import {
  addCurriculumSubjectInputSchema,
  branchInputSchema,
  branchSubjectsInputSchema,
  courseDetailSchema,
  createCourseInputSchema,
  createCurriculumInputSchema,
  curriculumDetailSchema,
  managedCurriculumSchema,
  resolveReviewPointInputSchema,
  reviewPointSchema,
  sigaaCourseEntrySchema,
  subjectEquivalencesInputSchema,
  updateCourseInputSchema,
  updateCurriculumInputSchema,
  updateSubjectInputSchema,
} from './catalog'
import {
  curriculumImportCreateQuerySchema,
  curriculumImportDetailSchema,
  curriculumImportListQuerySchema,
} from './ingestion'

const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'
const NOW = '2026-11-01T12:00:00.000Z'

const header = {
  code: '2006.2',
  effectiveTerm: '2006.2',
  slug: '2006-2',
  sigaaId: null,
  matrixName:
    'ENGENHARIA DE COMPUTAÇÃO - SOBRAL - BACHARELADO - Presencial - MT',
  unitName: 'CAMPUS DA UFC EM SOBRAL',
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
}

const summary = {
  id: ID,
  slug: '2006-2',
  code: '2006.2',
  effectiveTerm: '2006.2',
  status: 'PUBLISHED',
  isCurrent: true,
  needsReimport: false,
  publishedAt: NOW,
  updatedAt: NOW,
}

const subject = {
  subjectId: ID,
  code: 'ECO0083',
  name: 'Inteligência Computacional',
  type: 'DISCIPLINE',
  durationTerms: 1,
  workloadHours: 64,
  theoryHours: 64,
  labHours: 0,
  eadHours: 0,
  extensionHours: 0,
  credits: 4,
  semester: 7,
  nature: 'OPTATIVE',
  prerequisites: {
    kind: 'and',
    items: [
      { kind: 'subject', code: 'SBL0084' },
      {
        kind: 'or',
        items: [
          { kind: 'subject', code: 'CEC0022' },
          { kind: 'subject', code: 'ECO0018' },
        ],
      },
    ],
  },
  corequisites: null,
  equivalences: null,
  branches: [{ branchId: ID, nature: 'MANDATORY' }],
}

const branch = {
  id: ID,
  parentId: null,
  type: 'SLOPE',
  name: 'Ciências de Computação',
  description: null,
  sigaaCode: null,
  color: '#22d3ee',
  mandatoryHours: null,
  minHours: null,
  maxHours: null,
  minComponents: null,
  maxComponents: null,
  position: 0,
}

const detail = {
  ...summary,
  course: {
    id: ID,
    slug: 'engenharia-de-computacao',
    name: 'Eng. de Computação',
  },
  header,
  branches: [branch],
  subjects: [subject],
}

const reviewPoint = {
  key: 'name:SBL0074',
  importId: ID,
  code: 'SBL0074',
  resolvedAt: null,
  type: 'SUBJECT_NAME_MISMATCH',
  catalogName: 'FÍSICA GERAL I',
  importedName: 'FÍSICA GERAL I (TEORIA)',
  resolution: null,
}

describe('catálogo', () => {
  it('aceita o detalhe de curso e de EC', () => {
    expect(
      courseDetailSchema.safeParse({
        id: ID,
        sigaaId: '415113',
        slug: 'engenharia-de-computacao',
        name: 'Engenharia de Computação',
        icon: 'cpu',
        color: null,
        isActive: true,
        campus: {
          id: ID,
          slug: 'cufcsobral',
          name: 'Campus da UFC em Sobral',
          city: 'Sobral',
          state: 'CE',
        },
        curricula: [summary],
      }).success,
    ).toBe(true)
    expect(curriculumDetailSchema.safeParse(detail).success).toBe(true)
  })

  it('aceita a EC de gestão com pontos para revisar e checagem', () => {
    const managed = {
      ...detail,
      status: 'DRAFT',
      locked: false,
      reviewPoints: [
        reviewPoint,
        {
          ...reviewPoint,
          key: 'workload:SBL0074',
          type: 'SUBJECT_WORKLOAD_MISMATCH',
          catalog: {
            workloadHours: 64,
            theoryHours: 64,
            labHours: 0,
            eadHours: 0,
            extensionHours: 0,
            credits: 4,
          },
          imported: {
            workloadHours: 96,
            theoryHours: 64,
            labHours: 32,
            eadHours: 0,
            extensionHours: 0,
            credits: 6,
          },
        },
        {
          key: 'unknown:ECO0101:CEC0058',
          importId: ID,
          code: 'ECO0101',
          resolvedAt: NOW,
          type: 'UNKNOWN_REQUIREMENT_CODE',
          requiredCode: 'CEC0058',
          resolution: 'ACKNOWLEDGED',
        },
        {
          key: 'equivalences:ECO0083',
          importId: ID,
          code: 'ECO0083',
          resolvedAt: null,
          type: 'EQUIVALENCES_SUGGESTED',
          suggested: { kind: 'subject', code: 'CEC0058' },
          current: null,
          resolution: null,
        },
      ],
      publicationCheck: {
        canPublish: false,
        errors: [
          {
            code: 'UNRESOLVED_REVIEW_POINT',
            message: 'x',
            subjectCode: 'SBL0074',
          },
        ],
        warnings: [],
      },
    }
    expect(managedCurriculumSchema.safeParse(managed).success).toBe(true)
  })

  it('recusa resolução que não serve ao tipo do ponto', () => {
    expect(
      reviewPointSchema.safeParse({ ...reviewPoint, resolution: 'APPLY' })
        .success,
    ).toBe(false)
    expect(
      resolveReviewPointInputSchema.safeParse({ resolution: 'USE_IMPORTED' })
        .success,
    ).toBe(true)
  })

  it('valida as entradas de edição', () => {
    expect(
      createCurriculumInputSchema.parse({ ...header, sigaaId: undefined })
        .sigaaId,
    ).toBeNull()
    expect(
      updateCurriculumInputSchema.safeParse({ slug: '2006-2' }).success,
    ).toBe(true)
    expect(
      updateCurriculumInputSchema.safeParse({ slug: 'Com Espaço' }).success,
    ).toBe(false)

    const added = addCurriculumSubjectInputSchema.parse({
      code: 'ECO0200',
      semester: null,
      nature: 'OPTATIVE',
      prerequisites: null,
      corequisites: null,
      branches: [],
    })
    expect(added.subject).toBeNull()

    expect(
      branchInputSchema.safeParse({
        ...branch,
        id: undefined,
        position: undefined,
        name: ' ',
      }).success,
    ).toBe(false)
    expect(
      branchSubjectsInputSchema.safeParse({
        subjects: [{ code: 'ECO0083', nature: 'MANDATORY' }],
      }).success,
    ).toBe(true)
    expect(
      updateSubjectInputSchema.safeParse({ name: 'Cálculo I' }).success,
    ).toBe(true)
    expect(
      subjectEquivalencesInputSchema.safeParse({ equivalences: null }).success,
    ).toBe(true)
  })

  it('valida cursos e o catálogo do SIGAA', () => {
    expect(
      createCourseInputSchema.parse({
        sigaaId: '415113',
        slug: 'engenharia-de-computacao',
        name: 'Engenharia de Computação',
        icon: 'cpu',
      }).color,
    ).toBeNull()
    expect(
      createCourseInputSchema.safeParse({
        sigaaId: 'abc',
        slug: 'x',
        name: 'x',
        icon: 'x',
      }).success,
    ).toBe(false)
    expect(updateCourseInputSchema.safeParse({ isActive: false }).success).toBe(
      true,
    )
    expect(
      sigaaCourseEntrySchema.safeParse({
        sigaaCourse: {
          sigaaId: '415113',
          name: 'ENGENHARIA DE COMPUTAÇÃO',
          city: 'SOBRAL',
          modality: 'IN_PERSON',
          unitAcronym: 'CUFCSOBRAL',
          unitName: 'CAMPUS DA UFC EM SOBRAL',
        },
        flowCourseId: null,
        removed: false,
      }).success,
    ).toBe(true)
  })
})

describe('ingestão', () => {
  it('aceita o detalhe da importação com diff', () => {
    expect(
      curriculumImportDetailSchema.safeParse({
        id: ID,
        status: 'RECEIVED',
        source: 'EXTENSION',
        pendingReason: 'DIFF_REVIEW',
        course: {
          sigaaId: '415113',
          name: 'ENGENHARIA DE COMPUTAÇÃO',
          id: ID,
          slug: 'engenharia-de-computacao',
        },
        curriculum: { code: '2006.2', id: ID },
        subjectCount: 114,
        reviewPointCount: 1,
        importedBy: { id: ID, name: 'Ana' },
        createdAt: NOW,
        appliedAt: null,
        diff: {
          header: [{ field: 'minTotalHours', before: 3648, after: 3676 }],
          subjects: {
            added: ['ECO0200'],
            removed: [],
            changed: [
              {
                key: 'ECO0083',
                fields: [{ field: 'semester', before: 7, after: 8 }],
              },
            ],
          },
          branches: { added: [], removed: [], changed: [] },
        },
        reviewPoints: [reviewPoint],
      }).success,
    ).toBe(true)
  })

  it('usa a extensão como origem padrão e filtra por status', () => {
    expect(curriculumImportCreateQuerySchema.parse({}).source).toBe('EXTENSION')
    expect(
      curriculumImportListQuerySchema.parse({ status: 'RECEIVED' }),
    ).toEqual({
      status: 'RECEIVED',
      limit: 20,
    })
  })
})
