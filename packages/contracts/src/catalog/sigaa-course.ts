import type { SigaaCourse } from '@ufc-flow/academic-core'
import { z } from 'zod'

import { sigaaCourseModalitySchema } from '../enums'

const textSchema = z.string().trim().min(1)

// Curso da lista pública do SIGAA (public/curso/lista.jsf), usado para achar
// o código do curso de uma estrutura curricular (D34). Lido do select da
// tela de busca, vem sem modalidade e sem nome da unidade.
export const sigaaCourseSchema: z.ZodType<SigaaCourse> = z
  .object({
    sigaaId: z.string().regex(/^\d+$/, 'Id do SIGAA inválido'),
    name: textSchema,
    city: textSchema,
    modality: sigaaCourseModalitySchema.nullable(),
    unitAcronym: textSchema.nullable(),
    unitName: textSchema.nullable(),
  })
  .meta({ id: 'SigaaCourse' })
