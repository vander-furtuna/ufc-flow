import { z } from 'zod'

import { isoDateTimeSchema, uuidSchema } from '../common/primitives'

// Para que serve o arquivo (modelagem, Arquivos e imagens)
export const filePurposeSchema = z
  .enum([
    'AVATAR',
    'POST_COVER',
    'POST_IMAGE',
    'CERTIFICATE',
    'LINK_PAGE_IMAGE',
    'LINK_THUMBNAIL',
    'LINK_FILE',
  ])
  .meta({ id: 'FilePurpose' })

export const fileVisibilitySchema = z
  .enum(['PUBLIC', 'PRIVATE'])
  .meta({ id: 'FileVisibility' })

export const fileStatusSchema = z
  .enum(['PENDING', 'ATTACHED'])
  .meta({ id: 'FileStatus' })

// Campos de texto do upload multipart (o arquivo vai no campo "file")
export const fileUploadInputSchema = z
  .object({
    purpose: filePurposeSchema,
    // Obrigatório nas finalidades do curso (posts e página de links)
    courseId: uuidSchema.optional(),
  })
  .meta({ id: 'FileUploadInput' })

export const fileSchema = z
  .object({
    id: uuidSchema,
    purpose: filePurposeSchema,
    visibility: fileVisibilitySchema,
    status: fileStatusSchema,
    originalName: z.string(),
    // Depois do reprocessamento: imagens viram image/webp
    mimeType: z.string(),
    sizeBytes: z.int().nonnegative(),
    width: z.int().positive().nullable(),
    height: z.int().positive().nullable(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'File' })

export const avatarInputSchema = z
  .object({ fileId: uuidSchema })
  .meta({ id: 'AvatarInput' })

export type FilePurpose = z.infer<typeof filePurposeSchema>
export type FileVisibility = z.infer<typeof fileVisibilitySchema>
export type FileStatus = z.infer<typeof fileStatusSchema>
export type FileUploadInput = z.infer<typeof fileUploadInputSchema>
export type FileView = z.infer<typeof fileSchema>
export type AvatarInput = z.infer<typeof avatarInputSchema>
