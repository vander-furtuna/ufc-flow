import type { IconName } from 'lucide-react/dynamic'

export type Nature =
  | 'OBRIGATÓRIA'
  | 'OPTATIVA'
  | 'ATIVIDADE COMPLEMENTAR'
  | 'EXTENSÃO'
  | 'ESTÁGIO'
  | 'TCC'
  | 'MÓDULO'
  | 'TÓPICO ESPECIAL'
  | 'OUTRO'

export type SubjectType =
  | 'DISCIPLINA'
  | 'ATIVIDADE COMPLEMENTAR'
  | 'TRABALHO DE CONCLUSÃO DE CURSO'
  | 'ESTÁGIO'
  | 'UNIDADE CURRICULAR ESPECIAL DE EXTENSÃO'
  | 'MÓDULO'
  | 'TÓPICO AVANÇADO'
  | 'SEMINÁRIO'
  | 'TUTORIA'
  | 'OUTRO'

export type BranchType = 'EMPHASIS' | 'SPECIFIC_GROUP' | 'SLOPE'

export type Branch = {
  id: string
  name: string
  color: string
  type?: BranchType
  parentBranchId?: string
  minHours?: number
  minComponents?: number
}

export type Subject = {
  id: string
  code: string
  name: string
  semester: number
  duration: number
  nature: Nature
  type: SubjectType
  branch: string[]
  prerequisites: string[]
  equivalences: string[]
  corequisites: string[]
  slug: string
  details?: {
    aula: number
    lab: number
    ead: number
    ext: number
    cr: number
  }
  branchRelations?: {
    branchId: string
    nature: Nature
  }[]
}

export type CurriculumStructure = {
  id: string
  period: string
  slug: string
  city: string
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
  periodHours?: {
    min: number
    avg: number
    max: number
  }
  branchs: Branch[]
  subjects: Subject[]
}

export type Course = {
  id: string
  slug: string
  name: string
  icon: IconName
  curriculumStructures: CurriculumStructure[]
}
