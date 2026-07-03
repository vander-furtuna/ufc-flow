import type { Nature } from '@/types/course'

export const COLORS: Record<string, string> = {
  COMPULSORY: '#f97316',
  OPTIONAL: '#c026d3',
  COMPLEMENTARY_ACTIVITY: '#06b6d4',
  EXTENSION: '#10b981',
  INTERNSHIP: '#f59e0b',
  TCC: '#6366f1',
  MODULE: '#8b5cf6',
  SPECIAL_TOPIC: '#ec4899',
  OTHER: '#64748b',
}

export const NATURE_COLORS: Record<Nature, string> = {
  OBRIGATÓRIA: COLORS.COMPULSORY,
  OPTATIVA: COLORS.OPTIONAL,
  'ATIVIDADE COMPLEMENTAR': COLORS.COMPLEMENTARY_ACTIVITY,
  EXTENSÃO: COLORS.EXTENSION,
  ESTÁGIO: COLORS.INTERNSHIP,
  TCC: COLORS.TCC,
  MÓDULO: COLORS.MODULE,
  'TÓPICO ESPECIAL': COLORS.SPECIAL_TOPIC,
  OUTRO: COLORS.OTHER,
}

export type NatureConfigItem = {
  value: Nature
  label: string
  color: string
}

export const NATURE_CONFIG: NatureConfigItem[] = [
  { value: 'OBRIGATÓRIA', label: 'Obrigatória', color: COLORS.COMPULSORY },
  { value: 'OPTATIVA', label: 'Optativa', color: COLORS.OPTIONAL },
  {
    value: 'ATIVIDADE COMPLEMENTAR',
    label: 'Atividade Complementar',
    color: COLORS.COMPLEMENTARY_ACTIVITY,
  },
  { value: 'EXTENSÃO', label: 'Extensão', color: COLORS.EXTENSION },
  { value: 'ESTÁGIO', label: 'Estágio', color: COLORS.INTERNSHIP },
  { value: 'TCC', label: 'TCC', color: COLORS.TCC },
  { value: 'MÓDULO', label: 'Módulo', color: COLORS.MODULE },
  {
    value: 'TÓPICO ESPECIAL',
    label: 'Tópico Especial',
    color: COLORS.SPECIAL_TOPIC,
  },
  { value: 'OUTRO', label: 'Outro', color: COLORS.OTHER },
]
