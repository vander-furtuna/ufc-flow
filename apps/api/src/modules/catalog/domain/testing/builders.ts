import type { CurriculumHeader } from '@ufc-flow/contracts'

import type { Branch, Curriculum, CurriculumSubject } from '../curriculum'
import type { Subject } from '../subject'

const AT = new Date('2026-10-01T12:00:00.000Z')

export const aHeader = (
  overrides: Partial<CurriculumHeader> = {},
): CurriculumHeader => ({
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
  ...overrides,
})

export const aBranch = (overrides: Partial<Branch> = {}): Branch => ({
  id: 'b-1',
  parentId: null,
  type: 'SLOPE',
  name: 'Vertente',
  description: null,
  sigaaCode: null,
  color: null,
  mandatoryHours: null,
  minHours: null,
  maxHours: null,
  minComponents: null,
  maxComponents: null,
  position: 0,
  ...overrides,
})

export const aCurriculumSubject = (
  overrides: Partial<CurriculumSubject> = {},
): CurriculumSubject => {
  const code = overrides.code ?? 'ECO0001'
  return {
    id: `cs-${code}`,
    subjectId: `s-${code}`,
    code,
    semester: 1,
    nature: 'MANDATORY',
    prerequisites: null,
    corequisites: null,
    branches: [],
    ...overrides,
  }
}

export const aCurriculum = (
  overrides: Partial<Curriculum> = {},
): Curriculum => ({
  id: 'c-1',
  courseId: 'course-1',
  header: aHeader(),
  status: 'DRAFT',
  isCurrent: false,
  needsReimport: false,
  publishedAt: null,
  publishedBy: null,
  createdAt: AT,
  updatedAt: AT,
  branches: [],
  subjects: [],
  ...overrides,
})

export const aSubject = (overrides: Partial<Subject> = {}): Subject => {
  const code = overrides.code ?? 'ECO0001'
  return {
    id: `s-${code}`,
    code,
    name: 'Disciplina',
    type: 'DISCIPLINE',
    durationTerms: 1,
    workloadHours: 64,
    theoryHours: 64,
    labHours: 0,
    eadHours: 0,
    extensionHours: 0,
    credits: 4,
    equivalences: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  }
}
