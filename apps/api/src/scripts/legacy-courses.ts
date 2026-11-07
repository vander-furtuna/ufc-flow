import {
  normalizeRequirement,
  SUBJECT_CODE_PATTERN,
  type RequirementExpr,
} from '@ufc-flow/academic-core'
import type { CurriculumImportV1, SubjectType } from '@ufc-flow/contracts'

// Converte o legacy/courses-data.ts (o antigo courses.ts do front) para o
// CurriculumImportV1, para o seed passar pelo mesmo pipeline da extensão.
// Os pré-requisitos ali são listas e perderam o OU: entram como E de todos
// os códigos, e a EC fica marcada para reimportação.

type LegacyNature =
  | 'OBRIGATÓRIA'
  | 'OPTATIVA'
  | 'ATIVIDADE COMPLEMENTAR'
  | 'EXTENSÃO'
  | 'ESTÁGIO'
  | 'TCC'
  | 'MÓDULO'
  | 'TÓPICO ESPECIAL'
  | 'OUTRO'

type LegacySubject = {
  code: string
  name: string
  semester: number
  duration: number
  nature: LegacyNature
  type: string
  branch: string[]
  prerequisites: string[]
  equivalences: string[]
  corequisites: string[]
  details?: { aula: number; lab: number; ead: number; ext: number; cr: number }
  branchRelations?: { branchId: string; nature: LegacyNature }[]
}

type LegacyBranch = {
  id: string
  name: string
  color: string
  type?: 'EMPHASIS' | 'SPECIFIC_GROUP' | 'SLOPE'
  parentBranchId?: string
  minHours?: number
  minComponents?: number
}

export type LegacyCurriculum = {
  period: string
  slug: string
  city: string
  isCurrent?: boolean
  minTotalHours: number
  maxTotalHours?: number
  mandatoryHours?: number
  optativeHours?: number
  extensionHours?: number
  mandatoryAcademicActivityHours?: number
  maxOptativeFreeHours?: number
  minPeriods?: number
  avgPeriods?: number
  maxPeriods?: number
  periodHours?: { min: number; avg: number; max: number }
  branchs: LegacyBranch[]
  subjects: LegacySubject[]
}

export type LegacyCourse = {
  id: string
  slug: string
  name: string
  icon: string
  color?: string
  isActive?: boolean
  curriculumStructures: LegacyCurriculum[]
}

const TYPES: Record<string, SubjectType> = {
  DISCIPLINA: 'DISCIPLINE',
  'ATIVIDADE COMPLEMENTAR': 'COMPLEMENTARY_ACTIVITY',
  'TRABALHO DE CONCLUSÃO DE CURSO': 'FINAL_PROJECT',
  ESTÁGIO: 'INTERNSHIP',
  'UNIDADE CURRICULAR ESPECIAL DE EXTENSÃO': 'EXTENSION_UNIT',
  MÓDULO: 'MODULE',
  'TÓPICO AVANÇADO': 'ADVANCED_TOPIC',
  SEMINÁRIO: 'SEMINAR',
  TUTORIA: 'TUTORING',
}

// No front, a "natureza" mistura natureza e tipo; o que não é optativa é
// componente obrigatório (estágio, TCC, complementares, extensão, módulo)
const natureOf = (nature: LegacyNature) =>
  nature === 'OPTATIVA' ? ('OPTATIVE' as const) : ('MANDATORY' as const)

const validCodes = (codes: string[]) =>
  [...new Set(codes.map((code) => code.trim().toUpperCase()))].filter((code) =>
    SUBJECT_CODE_PATTERN.test(code),
  )

function listToExpr(
  codes: string[],
  kind: 'and' | 'or',
): RequirementExpr | null {
  const items = validCodes(codes).map((code) => ({
    kind: 'subject' as const,
    code,
  }))
  if (items.length === 0) return null
  return normalizeRequirement({ kind, items })
}

const isHexColor = (color: string) => /^#[0-9a-fA-F]{6}$/.test(color)

export function legacyToImport(
  course: LegacyCourse,
  curriculum: LegacyCurriculum,
  sigaa: { name: string; unitName: string | null } | null,
  extractedAt: string,
): CurriculumImportV1 {
  const courseName = sigaa?.name ?? course.name.toUpperCase()
  const branchIds = new Set(curriculum.branchs.map((branch) => branch.id))
  const period = Math.max(1, curriculum.minPeriods ?? 1)

  return {
    schemaVersion: 1,
    source: { extractedAt, url: null },
    course: { sigaaId: course.id, name: courseName, recognition: 'MANUAL' },
    curriculum: {
      code: curriculum.period,
      effectiveTerm: curriculum.period,
      sigaaId: null,
      matrixName: `${courseName} - ${curriculum.city.replace(/\s*-\s*CE$/, '')}`,
      unitName: sigaa?.unitName ?? null,
      city: curriculum.city,
      minTotalHours: curriculum.minTotalHours,
      maxTotalHours: curriculum.maxTotalHours ?? null,
      mandatoryHours: curriculum.mandatoryHours ?? 0,
      optativeHours: curriculum.optativeHours ?? 0,
      extensionHours: curriculum.extensionHours ?? 0,
      specificActivityHours: curriculum.mandatoryAcademicActivityHours ?? 0,
      maxFreeOptativeHours: curriculum.maxOptativeFreeHours ?? 0,
      minPeriods: period,
      avgPeriods: Math.max(period, curriculum.avgPeriods ?? period),
      maxPeriods: Math.max(period, curriculum.maxPeriods ?? period),
      periodMinHours: curriculum.periodHours?.min ?? 0,
      periodAvgHours: curriculum.periodHours?.avg ?? 0,
      periodMaxHours: curriculum.periodHours?.max ?? 0,
      minEmphases: null,
      maxEmphases: null,
    },
    branches: curriculum.branchs.map((branch) => ({
      key: branch.id,
      parentKey:
        branch.parentBranchId && branchIds.has(branch.parentBranchId)
          ? branch.parentBranchId
          : null,
      type: branch.type ?? 'SLOPE',
      name: branch.name,
      description: null,
      sigaaCode: null,
      color: isHexColor(branch.color) ? branch.color : null,
      mandatoryHours: null,
      minHours: branch.minHours ?? null,
      maxHours: null,
      minComponents: branch.minComponents ?? null,
      maxComponents: null,
    })),
    subjects: curriculum.subjects.map((subject) => {
      const details = subject.details
      const links =
        subject.branchRelations && subject.branchRelations.length > 0
          ? subject.branchRelations.map((link) => ({
              key: link.branchId,
              nature: natureOf(link.nature),
            }))
          : subject.branch.map((key) => ({
              key,
              nature: natureOf(subject.nature),
            }))
      return {
        code: subject.code.trim().toUpperCase(),
        name: subject.name.trim(),
        type: TYPES[subject.type] ?? 'OTHER',
        semester: subject.semester >= 1 ? subject.semester : null,
        durationTerms: 1 as const,
        workloadHours: subject.duration,
        theoryHours: details?.aula ?? subject.duration,
        labHours: details?.lab ?? 0,
        eadHours: details?.ead ?? 0,
        extensionHours: details?.ext ?? 0,
        credits: details?.cr ?? 0,
        nature: natureOf(subject.nature),
        prerequisites: listToExpr(subject.prerequisites, 'and'),
        corequisites: listToExpr(subject.corequisites, 'and'),
        equivalences: listToExpr(subject.equivalences, 'or'),
        branches: links.filter(
          (link, index) =>
            branchIds.has(link.key) &&
            links.findIndex((item) => item.key === link.key) === index,
        ),
      }
    }),
  }
}

// Os dados moram ao lado, desde que saíram do web (D51)
export async function loadLegacyCourses(): Promise<LegacyCourse[]> {
  return (await import('./legacy/courses-data'))
    .COURSES_DATA as unknown as LegacyCourse[]
}
