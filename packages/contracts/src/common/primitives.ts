import { SUBJECT_CODE_PATTERN, TERM_PATTERN } from '@ufc-flow/academic-core'
import { z } from 'zod'

// Os padrões vêm do academic-core, para que contrato e regra não divirjam.
// Ficam como regex (e não refine) para aparecerem no JSON Schema.
export const subjectCodeSchema = z
  .string()
  .regex(SUBJECT_CODE_PATTERN, 'Código de disciplina inválido')

export const termSchema = z
  .string()
  .regex(TERM_PATTERN, 'Termo letivo inválido (use 2026.1 ou 2026.2)')

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido')

export const uuidSchema = z.uuid()

// Data e hora ISO 8601, sempre com fuso
export const isoDateTimeSchema = z.iso.datetime({ offset: true })

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use #rrggbb)')

export const hoursSchema = z.int().nonnegative()
