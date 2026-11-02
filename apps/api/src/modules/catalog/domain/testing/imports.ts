import type { CurriculumImportV1 } from '@ufc-flow/contracts'

type ImportSubject = CurriculumImportV1['subjects'][number]
type ImportBranch = CurriculumImportV1['branches'][number]

export const anImportSubject = (
  overrides: Partial<ImportSubject> = {},
): ImportSubject => ({
  code: 'ECO0001',
  name: 'Disciplina',
  type: 'DISCIPLINE',
  semester: 1,
  durationTerms: 1,
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

export const anImportBranch = (
  overrides: Partial<ImportBranch> = {},
): ImportBranch => ({
  key: 'slope-computacao',
  parentKey: null,
  type: 'SLOPE',
  name: 'Computação',
  description: null,
  sigaaCode: null,
  color: '#22d3ee',
  mandatoryHours: null,
  minHours: null,
  maxHours: null,
  minComponents: null,
  maxComponents: null,
  ...overrides,
})

// Arquivo mínimo de Eng. de Computação 2006.2, com campos sobrescrevíveis
export function anImport(
  overrides: {
    course?: Partial<CurriculumImportV1['course']>
    curriculum?: Partial<CurriculumImportV1['curriculum']>
    branches?: ImportBranch[]
    subjects?: ImportSubject[]
  } = {},
): CurriculumImportV1 {
  return {
    schemaVersion: 1,
    source: { extractedAt: '2026-10-29T12:00:00.000Z', url: null },
    course: {
      sigaaId: '415113',
      name: 'ENGENHARIA DE COMPUTAÇÃO',
      recognition: 'SELECTED',
      ...overrides.course,
    },
    curriculum: {
      code: '2006.2',
      effectiveTerm: '2006.2',
      sigaaId: null,
      matrixName:
        'ENGENHARIA DE COMPUTAÇÃO - SOBRAL - Presencial - MT - BACHARELADO',
      unitName: 'CAMPUS DA UFC EM SOBRAL (11.00.01.28)',
      city: 'SOBRAL - CE',
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
      ...overrides.curriculum,
    },
    branches: overrides.branches ?? [],
    subjects: overrides.subjects ?? [anImportSubject()],
  }
}
