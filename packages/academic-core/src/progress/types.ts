import type { Equivalences } from '../requirements/evaluate-requirement'
import type { RequirementExpr } from '../requirements/types'

// Natureza da disciplina na EC para a integralização. TCC, estágio e afins
// entram como obrigatórias ou optativas, conforme a EC.
export type CurriculumNature = 'MANDATORY' | 'OPTATIVE'

export type ActivityKind = 'COMPLEMENTARY' | 'EXTENSION'

export type ProgressCurriculum = {
  mandatoryHours: number
  optativeHours: number
  maxFreeOptativeHours: number
  complementaryActivityHours: number
  extensionHours: number
  minTotalHours: number
  subjects: readonly {
    code: string
    nature: CurriculumNature
    workloadHours: number
    extensionHours: number
    branchIds?: readonly string[]
  }[]
  branches: readonly {
    id: string
    parentId: string | null
    minHours: number | null
    minComponents: number | null
  }[]
  activityCategories: readonly {
    id: string
    kind: ActivityKind
    maxHours: number | null
  }[]
}

// Disciplina com APROVADO ou APROVEITADA, com as cargas do catálogo
export type CompletedSubject = {
  code: string
  workloadHours: number
  extensionHours: number
}

export type ActivityRecord = {
  kind: ActivityKind
  categoryId: string | null
  hours: number
}

export type ProgressInput = {
  curriculum: ProgressCurriculum
  completedSubjects: readonly CompletedSubject[]
  activities: readonly ActivityRecord[]
  equivalences?: Equivalences
}

export type HoursProgress = {
  requiredHours: number
  completedHours: number
  met: boolean
}

export type IntegrationProgress = {
  mandatory: HoursProgress
  optative: HoursProgress & {
    // Optativas da EC cumpridas
    curriculumHours: number
    // Disciplinas fora da EC contadas como livres, já com o teto
    freeHours: number
    // Horas livres que passaram do teto e não contam
    freeHoursOverCap: number
  }
  branches: {
    branchId: string
    minHours: number | null
    minComponents: number | null
    completedHours: number
    completedComponents: number
    met: boolean
  }[]
  complementary: HoursProgress & {
    byCategory: {
      categoryId: string | null
      declaredHours: number
      countedHours: number
    }[]
  }
  extension: HoursProgress & {
    fromSubjectsHours: number
    fromActivitiesHours: number
  }
  total: HoursProgress
}

// Requisitos de uma disciplina da EC, para calcular as liberadas
export type CurriculumRequirements = {
  code: string
  prerequisite: RequirementExpr | null
  corequisite: RequirementExpr | null
}

export type AvailableSubject = {
  code: string
  // Co-requisitos ainda não cumpridos nem em andamento: cursar junto
  missingCorequisites: string[]
}
