import { collectCodes, normalizeSearchText } from '@ufc-flow/academic-core'
import type {
  CourseDetail,
  CurriculumDetail,
  CurriculumSubjectView,
  SubjectType as ApiSubjectType,
} from '@ufc-flow/contracts'

import type {
  Branch,
  Course,
  CurriculumStructure,
  Nature,
  Subject,
  SubjectType,
} from '@/types/course'

// Converte o catálogo da API no formato do front atual (types/course.ts),
// para as telas públicas lerem da API sem mudar (fase 5, PR 5.4). Os
// requisitos viram listas de códigos, como o front já usa no grafo.

const TYPES: Record<ApiSubjectType, SubjectType> = {
  DISCIPLINE: 'DISCIPLINA',
  COMPLEMENTARY_ACTIVITY: 'ATIVIDADE COMPLEMENTAR',
  FINAL_PROJECT: 'TRABALHO DE CONCLUSÃO DE CURSO',
  INTERNSHIP: 'ESTÁGIO',
  EXTENSION_UNIT: 'UNIDADE CURRICULAR ESPECIAL DE EXTENSÃO',
  MODULE: 'MÓDULO',
  ADVANCED_TOPIC: 'TÓPICO AVANÇADO',
  SEMINAR: 'SEMINÁRIO',
  TUTORING: 'TUTORIA',
  INTEGRATIVE_ACTIVITY: 'OUTRO',
  OTHER: 'OUTRO',
}

// No front, a "natureza" de um componente obrigatório que não é disciplina
// é o tipo dele (estágio, TCC...), como estava no courses.ts
const MANDATORY_BY_TYPE: Partial<Record<ApiSubjectType, Nature>> = {
  INTERNSHIP: 'ESTÁGIO',
  FINAL_PROJECT: 'TCC',
  COMPLEMENTARY_ACTIVITY: 'ATIVIDADE COMPLEMENTAR',
  EXTENSION_UNIT: 'EXTENSÃO',
  MODULE: 'MÓDULO',
}

const NEUTRAL_COLOR = '#64748b'

const natureOf = (
  subject: Pick<CurriculumSubjectView, 'nature' | 'type'>,
): Nature =>
  subject.nature === 'OPTATIVE'
    ? 'OPTATIVA'
    : (MANDATORY_BY_TYPE[subject.type] ?? 'OBRIGATÓRIA')

const slugOf = (name: string) =>
  normalizeSearchText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const codes = (expr: CurriculumSubjectView['prerequisites']) => [
  ...new Set(collectCodes(expr)),
]

function toSubject(
  subject: CurriculumSubjectView,
  lastSemester: number,
): Subject {
  return {
    id: subject.subjectId,
    code: subject.code,
    name: subject.name,
    semester: subject.semester ?? lastSemester,
    duration: subject.workloadHours,
    nature: natureOf(subject),
    type: TYPES[subject.type],
    branch: subject.branches.map((link) => link.branchId),
    prerequisites: codes(subject.prerequisites),
    corequisites: codes(subject.corequisites),
    equivalences: codes(subject.equivalences),
    slug: slugOf(subject.name),
    details: {
      aula: subject.theoryHours,
      lab: subject.labHours,
      ead: subject.eadHours,
      ext: subject.extensionHours,
      cr: subject.credits,
    },
    branchRelations: subject.branches.map((link) => ({
      branchId: link.branchId,
      nature: link.nature === 'OPTATIVE' ? 'OPTATIVA' : 'OBRIGATÓRIA',
    })),
  }
}

function toBranch(branch: CurriculumDetail['branches'][number]): Branch {
  return {
    id: branch.id,
    name: branch.name,
    color: branch.color ?? NEUTRAL_COLOR,
    type: branch.type,
    ...(branch.parentId ? { parentBranchId: branch.parentId } : {}),
    ...(branch.minHours !== null ? { minHours: branch.minHours } : {}),
    ...(branch.minComponents !== null
      ? { minComponents: branch.minComponents }
      : {}),
  }
}

function toStructure(
  curriculum: CurriculumDetail,
  city: string,
): CurriculumStructure {
  const { header } = curriculum
  const lastSemester = Math.max(
    1,
    ...curriculum.subjects.map((subject) => subject.semester ?? 0),
  )
  return {
    id: curriculum.code,
    period: curriculum.code,
    slug: curriculum.slug,
    city,
    isCurrent: curriculum.isCurrent,
    minTotalHours: header.minTotalHours,
    ...(header.maxTotalHours !== null
      ? { maxTotalHours: header.maxTotalHours }
      : {}),
    mandatoryHours: header.mandatoryHours,
    optativeHours: header.optativeHours,
    extensionHours: header.extensionHours,
    mandatoryAcademicActivityHours: header.specificActivityHours,
    maxOptativeFreeHours: header.maxFreeOptativeHours,
    minPeriods: header.minPeriods,
    avgPeriods: header.avgPeriods,
    maxPeriods: header.maxPeriods,
    periodHours: {
      min: header.periodMinHours,
      avg: header.periodAvgHours,
      max: header.periodMaxHours,
    },
    branchs: [...curriculum.branches]
      .sort((a, b) => a.position - b.position)
      .map(toBranch),
    subjects: curriculum.subjects.map((subject) =>
      toSubject(subject, lastSemester),
    ),
  }
}

export function toLegacyCourse(
  course: CourseDetail,
  curricula: CurriculumDetail[],
): Course {
  // "SOBRAL - CE", como as ECs do courses.ts
  const city = `${course.campus.city.toUpperCase()} - ${course.campus.state}`
  return {
    // O id do curso no front sempre foi o código do SIGAA
    id: course.sigaaId,
    slug: course.slug,
    name: course.name,
    icon: course.icon,
    ...(course.color ? { color: course.color } : {}),
    isActive: course.isActive,
    curriculumStructures: curricula.map((curriculum) =>
      toStructure(curriculum, city),
    ),
  }
}
