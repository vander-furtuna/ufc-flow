import type {
  ActivityKind,
  CurriculumNature,
  RecordStatus,
} from '@ufc-flow/academic-core'
import { z } from 'zod'

// Enums do banco e da API, com os nomes da modelagem. Os que existem no
// academic-core são tipados contra ele (D29).

// Catálogo
export const curriculumNatureSchema = z.enum([
  'MANDATORY',
  'OPTATIVE',
] satisfies CurriculumNature[])

// Tipos de componente do SIGAA, os mesmos da extensão atual (D30)
export const subjectTypeSchema = z.enum([
  'DISCIPLINE',
  'COMPLEMENTARY_ACTIVITY',
  'FINAL_PROJECT',
  'INTERNSHIP',
  'EXTENSION_UNIT',
  'MODULE',
  'ADVANCED_TOPIC',
  'SEMINAR',
  'TUTORING',
  'OTHER',
])

export const branchTypeSchema = z.enum(['SLOPE', 'EMPHASIS', 'SPECIFIC_GROUP'])

export const curriculumStatusSchema = z.enum(['DRAFT', 'PUBLISHED'])

// Vida acadêmica
export const recordStatusSchema = z.enum([
  'CURSANDO',
  'APROVADO',
  'REPROVADO',
  'TRANCADA',
  'SUPRIMIDA',
  'APROVEITADA',
] satisfies RecordStatus[])

export const enrollmentStatusSchema = z.enum([
  'ACTIVE',
  'TRANSFERRED',
  'CONCLUDED',
  'CANCELED',
])

export const activityKindSchema = z.enum([
  'COMPLEMENTARY',
  'EXTENSION',
] satisfies ActivityKind[])

// Identidade
export const userRoleSchema = z.enum(['ADMIN'])

export const userStatusSchema = z.enum(['ACTIVE', 'SUSPENDED'])

export const moderatorRequestStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELED',
])

// Importação de grades
export const curriculumImportSourceSchema = z.enum(['EXTENSION', 'UPLOAD'])

export const curriculumImportStatusSchema = z.enum([
  'RECEIVED',
  'APPLIED',
  'FAILED',
  'DISCARDED',
])

// Hub
export const postTypeSchema = z.enum([
  'NEWS',
  'EVENT',
  'SCHOLARSHIP',
  'EXTENSION_PROJECT',
  'CALL',
])

export const postStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

export const eventModalitySchema = z.enum(['IN_PERSON', 'ONLINE', 'HYBRID'])

// Página de links
export const linkKindSchema = z.enum(['URL', 'FILE', 'INTERNAL', 'POST'])

export const linkBadgeSchema = z.enum(['NONE', 'NEW'])

export const linkPageThemeSchema = z.enum([
  'CIANO',
  'LARANJA',
  'VERDE',
  'VIOLETA',
  'BRANCO',
  'ESCURO',
])

export const linkButtonStyleSchema = z.enum(['FILLED', 'OUTLINE', 'SOFT'])

export const linkButtonShapeSchema = z.enum(['SQUARE', 'ROUNDED', 'PILL'])

export const linkTitleFontSchema = z.enum(['CLASH', 'GEIST'])

export const socialNetworkSchema = z.enum([
  'INSTAGRAM',
  'EMAIL',
  'WHATSAPP',
  'YOUTUBE',
  'SITE',
  'OUTRO',
])

export const linkTrafficSourceSchema = z.enum(['PAGE', 'QR', 'HUB'])

export type SubjectType = z.infer<typeof subjectTypeSchema>
export type BranchType = z.infer<typeof branchTypeSchema>
export type CurriculumStatus = z.infer<typeof curriculumStatusSchema>
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>
export type UserRole = z.infer<typeof userRoleSchema>
export type UserStatus = z.infer<typeof userStatusSchema>
export type ModeratorRequestStatus = z.infer<
  typeof moderatorRequestStatusSchema
>
export type CurriculumImportSource = z.infer<
  typeof curriculumImportSourceSchema
>
export type CurriculumImportStatus = z.infer<
  typeof curriculumImportStatusSchema
>
export type PostType = z.infer<typeof postTypeSchema>
export type PostStatus = z.infer<typeof postStatusSchema>
export type EventModality = z.infer<typeof eventModalitySchema>
export type LinkKind = z.infer<typeof linkKindSchema>
export type LinkBadge = z.infer<typeof linkBadgeSchema>
export type LinkPageTheme = z.infer<typeof linkPageThemeSchema>
export type LinkButtonStyle = z.infer<typeof linkButtonStyleSchema>
export type LinkButtonShape = z.infer<typeof linkButtonShapeSchema>
export type LinkTitleFont = z.infer<typeof linkTitleFontSchema>
export type SocialNetwork = z.infer<typeof socialNetworkSchema>
export type LinkTrafficSource = z.infer<typeof linkTrafficSourceSchema>

// Nomes dos enums como componentes do OpenAPI (#/components/schemas/<id>)
const enumIds: [z.ZodType, string][] = [
  [curriculumNatureSchema, 'CurriculumNature'],
  [subjectTypeSchema, 'SubjectType'],
  [branchTypeSchema, 'BranchType'],
  [curriculumStatusSchema, 'CurriculumStatus'],
  [recordStatusSchema, 'RecordStatus'],
  [enrollmentStatusSchema, 'EnrollmentStatus'],
  [activityKindSchema, 'ActivityKind'],
  [userRoleSchema, 'UserRole'],
  [userStatusSchema, 'UserStatus'],
  [moderatorRequestStatusSchema, 'ModeratorRequestStatus'],
  [curriculumImportSourceSchema, 'CurriculumImportSource'],
  [curriculumImportStatusSchema, 'CurriculumImportStatus'],
  [postTypeSchema, 'PostType'],
  [postStatusSchema, 'PostStatus'],
  [eventModalitySchema, 'EventModality'],
  [linkKindSchema, 'LinkKind'],
  [linkBadgeSchema, 'LinkBadge'],
  [linkPageThemeSchema, 'LinkPageTheme'],
  [linkButtonStyleSchema, 'LinkButtonStyle'],
  [linkButtonShapeSchema, 'LinkButtonShape'],
  [linkTitleFontSchema, 'LinkTitleFont'],
  [socialNetworkSchema, 'SocialNetwork'],
  [linkTrafficSourceSchema, 'LinkTrafficSource'],
]

for (const [schema, id] of enumIds) schema.register(z.globalRegistry, { id })
