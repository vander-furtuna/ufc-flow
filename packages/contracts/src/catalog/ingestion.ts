import { z } from 'zod'

import { cursorPage, cursorPageQuerySchema } from '../common/pagination'
import { isoDateTimeSchema, uuidSchema } from '../common/primitives'
import {
  curriculumImportSourceSchema,
  curriculumImportStatusSchema,
} from '../enums'
import { reviewPointSchema } from './catalog'

// Por que uma importação recebida ainda não virou EC: o curso não existe no
// Flow, ou a EC já existe e o diff espera quem aplique
export const curriculumImportPendingReasonSchema = z.enum([
  'COURSE_MISSING',
  'DIFF_REVIEW',
])

export const curriculumImportSchema = z
  .object({
    id: uuidSchema,
    status: curriculumImportStatusSchema,
    source: curriculumImportSourceSchema,
    pendingReason: curriculumImportPendingReasonSchema.nullable(),
    course: z.object({
      sigaaId: z.string(),
      name: z.string(),
      // Curso do Flow, quando existe
      id: uuidSchema.nullable(),
      slug: z.string().nullable(),
    }),
    curriculum: z.object({
      code: z.string(),
      // EC criada ou atualizada pela importação
      id: uuidSchema.nullable(),
    }),
    subjectCount: z.int().nonnegative(),
    reviewPointCount: z.int().nonnegative(),
    importedBy: z.object({ id: uuidSchema, name: z.string() }).nullable(),
    createdAt: isoDateTimeSchema,
    appliedAt: isoDateTimeSchema.nullable(),
  })
  .meta({ id: 'CurriculumImport' })

const fieldChangeSchema = z.object({
  field: z.string(),
  before: z.unknown(),
  after: z.unknown(),
})

const itemChangeSchema = z.object({
  key: z.string(),
  fields: z.array(fieldChangeSchema),
})

// Diferenças entre o arquivo e a EC que já existe no Flow
export const curriculumDiffSchema = z
  .object({
    header: z.array(fieldChangeSchema),
    subjects: z.object({
      added: z.array(z.string()),
      removed: z.array(z.string()),
      changed: z.array(itemChangeSchema),
    }),
    branches: z.object({
      added: z.array(z.string()),
      removed: z.array(z.string()),
      changed: z.array(itemChangeSchema),
    }),
  })
  .meta({ id: 'CurriculumDiff' })

export const curriculumImportDetailSchema = curriculumImportSchema
  .extend({
    diff: curriculumDiffSchema.nullable(),
    reviewPoints: z.array(reviewPointSchema),
  })
  .meta({ id: 'CurriculumImportDetail' })

export const curriculumImportPageSchema = cursorPage(
  curriculumImportSchema,
).meta({ id: 'CurriculumImportPage' })

// ?status=RECEIVED&cursor=&limit=
export const curriculumImportListQuerySchema = cursorPageQuerySchema.extend({
  status: curriculumImportStatusSchema.optional(),
})

// ?source=UPLOAD no upload pela área administrativa; a extensão manda o
// arquivo sem query
export const curriculumImportCreateQuerySchema = z.object({
  source: curriculumImportSourceSchema.default('EXTENSION'),
})

export type CurriculumImportPendingReason = z.infer<
  typeof curriculumImportPendingReasonSchema
>
export type CurriculumImportView = z.infer<typeof curriculumImportSchema>
export type CurriculumDiff = z.infer<typeof curriculumDiffSchema>
export type CurriculumImportDetail = z.infer<
  typeof curriculumImportDetailSchema
>
export type CurriculumImportListQuery = z.infer<
  typeof curriculumImportListQuerySchema
>
export type CurriculumImportCreateQuery = z.infer<
  typeof curriculumImportCreateQuerySchema
>
