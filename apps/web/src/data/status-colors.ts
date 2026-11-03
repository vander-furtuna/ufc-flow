import type { RecordStatus } from '@ufc-flow/academic-core'
import type { SubjectRecordView } from '@ufc-flow/contracts'

import { COLORS } from './colors'

// Cores das situações do histórico (design-system.md), num só lugar
export const STATUS_CLASSES: Record<RecordStatus, string> = {
  CURSANDO: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
  APROVADO:
    'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300',
  REPROVADO: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  TRANCADA:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  SUPRIMIDA:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  APROVEITADA:
    'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
}

// Borda do botão de situação selecionado
export const STATUS_BORDERS: Record<RecordStatus, string> = {
  CURSANDO: 'border-cyan-300 dark:border-cyan-700',
  APROVADO: 'border-green-300 dark:border-green-700',
  REPROVADO: 'border-red-300 dark:border-red-700',
  TRANCADA: 'border-amber-300 dark:border-amber-700',
  SUPRIMIDA: 'border-slate-300 dark:border-slate-500',
  APROVEITADA: 'border-indigo-300 dark:border-indigo-700',
}

// Barra de natureza ao lado do nome (Obrigatória laranja, Optativa fúcsia)
export const RECORD_NATURE_COLORS: Record<SubjectRecordView['nature'], string> =
  {
    MANDATORY: COLORS.COMPULSORY,
    OPTATIVE: COLORS.OPTIONAL,
    FREE: COLORS.OTHER,
  }
