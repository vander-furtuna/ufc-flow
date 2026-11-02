import type {
  BranchType,
  CurriculumImportView,
  CurriculumStatus,
  ReviewPoint,
  SubjectType,
} from '@ufc-flow/contracts'

// Rótulos e cores do catálogo na área /admin, num só lugar

export type CurriculumNature = 'MANDATORY' | 'OPTATIVE'

export const NATURE_LABELS: Record<CurriculumNature, string> = {
  MANDATORY: 'Obrigatória',
  OPTATIVE: 'Optativa',
}

// Versão clara de NATURE_COLORS (design system, Natureza das disciplinas)
export const NATURE_CHIP: Record<CurriculumNature, string> = {
  MANDATORY:
    'bg-orange-50 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  OPTATIVE:
    'bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
}

export const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  SLOPE: 'Vertente',
  EMPHASIS: 'Ênfase',
  SPECIFIC_GROUP: 'Grupo de componentes',
}

export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  DISCIPLINE: 'Disciplina',
  COMPLEMENTARY_ACTIVITY: 'Atividade complementar',
  FINAL_PROJECT: 'Trabalho de conclusão de curso',
  INTERNSHIP: 'Estágio',
  EXTENSION_UNIT: 'Unidade curricular especial de extensão',
  MODULE: 'Módulo',
  ADVANCED_TOPIC: 'Tópico avançado',
  SEMINAR: 'Seminário',
  TUTORING: 'Tutoria',
  INTEGRATIVE_ACTIVITY: 'Atividades integradoras de formação',
  OTHER: 'Outro',
}

export const STATUS_CHIP: Record<
  CurriculumStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Rascunho',
    className:
      'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  },
  PUBLISHED: {
    label: 'Publicada',
    className:
      'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  },
}

export const CURRENT_CHIP =
  'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300'

export function importStatus(
  view: Pick<CurriculumImportView, 'status' | 'pendingReason'>,
): {
  label: string
  className: string
} {
  if (view.status === 'APPLIED')
    return { label: 'Aplicada', className: STATUS_CHIP.PUBLISHED.className }
  if (view.status === 'DISCARDED' || view.status === 'FAILED') {
    return {
      label: view.status === 'DISCARDED' ? 'Descartada' : 'Falhou',
      className: 'bg-muted text-muted-foreground',
    }
  }
  return {
    label:
      view.pendingReason === 'COURSE_MISSING'
        ? 'Falta o curso'
        : 'Diferenças para aplicar',
    className: STATUS_CHIP.DRAFT.className,
  }
}

// Texto do ponto para revisar (Admin-EC)
export function reviewPointText(point: ReviewPoint): string {
  switch (point.type) {
    case 'SUBJECT_NAME_MISMATCH':
      return `o SIGAA chama de “${point.importedName}”; o catálogo, de “${point.catalogName}”.`
    case 'SUBJECT_WORKLOAD_MISMATCH':
      return `a carga do SIGAA é de ${point.imported.workloadHours} h (${point.imported.credits} créditos); a do catálogo, ${point.catalog.workloadHours} h (${point.catalog.credits} créditos).`
    case 'UNKNOWN_REQUIREMENT_CODE':
      return `o requisito cita ${point.requiredCode}, que não está no catálogo. Fica como texto até ser importado.`
    case 'EQUIVALENCES_SUGGESTED':
      return 'a importação sugere outras equivalências. Equivalências valem para todos os cursos: só um administrador aplica.'
  }
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

export const formatHours = (hours: number) =>
  `${hours.toLocaleString('pt-BR')} h`

// Campos do cabeçalho da EC, para o diff da reimportação
export const HEADER_FIELD_LABELS: Record<string, string> = {
  code: 'código',
  effectiveTerm: 'vigor',
  sigaaId: 'id no SIGAA',
  matrixName: 'matriz',
  unitName: 'unidade',
  minTotalHours: 'CH total mínima',
  maxTotalHours: 'CH total máxima',
  mandatoryHours: 'CH obrigatória',
  optativeHours: 'CH optativa',
  extensionHours: 'CH de extensão',
  specificActivityHours: 'atividade acadêmica específica',
  maxFreeOptativeHours: 'optativa livre máxima',
  minPeriods: 'prazo mínimo',
  avgPeriods: 'prazo médio',
  maxPeriods: 'prazo máximo',
  periodMinHours: 'CH mínima por período',
  periodAvgHours: 'CH média por período',
  periodMaxHours: 'CH máxima por período',
  minEmphases: 'ênfases exigidas',
  maxEmphases: 'ênfases permitidas',
}
