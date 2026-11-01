import type { CurriculumImportV1, SubjectType } from '@ufc-flow/contracts'

// Rótulos em português para a interface
export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  DISCIPLINE: 'Disciplina',
  COMPLEMENTARY_ACTIVITY: 'Atividade complementar',
  FINAL_PROJECT: 'TCC',
  INTERNSHIP: 'Estágio',
  EXTENSION_UNIT: 'Unidade de extensão',
  MODULE: 'Módulo',
  ADVANCED_TOPIC: 'Tópico avançado',
  SEMINAR: 'Seminário',
  TUTORING: 'Tutoria',
  INTEGRATIVE_ACTIVITY: 'Atividade integradora',
  OTHER: 'Outro',
}

type Nature = CurriculumImportV1['subjects'][number]['nature']

export const NATURE_LABELS: Record<Nature, string> = {
  MANDATORY: 'Obrigatória',
  OPTATIVE: 'Optativa',
}

export const BRANCH_TYPE_LABELS: Record<
  CurriculumImportV1['branches'][number]['type'],
  string
> = {
  EMPHASIS: 'Ênfase',
  SPECIFIC_GROUP: 'Grupo de componentes',
  SLOPE: 'Vertente',
}
