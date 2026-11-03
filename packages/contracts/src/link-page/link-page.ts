import { z } from 'zod'

import { isoDateTimeSchema, slugSchema, uuidSchema } from '../common/primitives'
import {
  linkBadgeSchema,
  linkButtonShapeSchema,
  linkButtonStyleSchema,
  linkKindSchema,
  linkPageThemeSchema,
  linkTitleFontSchema,
  linkTrafficSourceSchema,
  socialNetworkSchema,
} from '../enums'

// Telas do Flow que um link INTERNAL pode abrir (D87); fórum na fase 11
export const internalTargetSchema = z
  .enum(['GRADE', 'AGENDA', 'HUB', 'CALENDARIO', 'RU'])
  .meta({ id: 'LinkInternalTarget' })

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .default(null)

const httpUrl = z
  .url({ protocol: /^https?$/, message: 'Use um endereço http ou https' })
  .max(1000)

// ——— Entrada (moderador do curso ou admin) ———

export const linkPageSettingsInputSchema = z
  .object({
    // Trocar o slug quebra QR codes já impressos: o editor avisa antes
    slug: slugSchema,
    bio: optionalText(160),
    avatarFileId: uuidSchema.nullable().default(null),
    // Ícone do curso quando não há foto (mesmos nomes dos ícones do curso)
    avatarIcon: optionalText(40),
    coverFileId: uuidSchema.nullable().default(null),
    theme: linkPageThemeSchema,
    buttonStyle: linkButtonStyleSchema,
    buttonShape: linkButtonShapeSchema,
    titleFont: linkTitleFontSchema,
    isPublished: z.boolean(),
  })
  .meta({ id: 'LinkPageSettingsInput' })

export const linkSectionInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Dê um título à seção').max(60),
    isVisible: z.boolean().default(true),
  })
  .meta({ id: 'LinkSectionInput' })

// Campo do alvo que cada tipo exige; os demais ficam nulos
const TARGET_FIELD = {
  URL: 'url',
  FILE: 'fileId',
  INTERNAL: 'internalTarget',
  POST: 'postId',
} as const

export const linkInputSchema = z
  .object({
    sectionId: uuidSchema.nullable().default(null),
    kind: linkKindSchema,
    label: z.string().trim().min(1, 'Dê um nome ao link').max(80),
    description: optionalText(120),
    url: httpUrl.nullable().default(null),
    fileId: uuidSchema.nullable().default(null),
    internalTarget: internalTargetSchema.nullable().default(null),
    postId: uuidSchema.nullable().default(null),
    icon: optionalText(40),
    thumbnailFileId: uuidSchema.nullable().default(null),
    // No máximo um por página: marcar este desmarca o anterior
    isFeatured: z.boolean().default(false),
    badge: linkBadgeSchema.default('NONE'),
    openInSameTab: z.boolean().default(false),
    visibleFrom: isoDateTimeSchema.nullable().default(null),
    visibleUntil: isoDateTimeSchema.nullable().default(null),
    isVisible: z.boolean().default(true),
  })
  .superRefine((link, ctx) => {
    const expected = TARGET_FIELD[link.kind]
    for (const field of Object.values(TARGET_FIELD)) {
      const filled = link[field] !== null
      if (field === expected && !filled) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Informe o destino do link',
        })
      } else if (field !== expected && filled) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Este destino não combina com o tipo do link',
        })
      }
    }
    if (
      link.visibleFrom &&
      link.visibleUntil &&
      Date.parse(link.visibleUntil) <= Date.parse(link.visibleFrom)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['visibleUntil'],
        message: 'O fim precisa ser depois do início',
      })
    }
  })
  .meta({ id: 'LinkInput' })

export const socialLinkInputSchema = z
  .object({
    network: socialNetworkSchema,
    // E-mail aceita o endereço puro; as demais redes, http ou https
    url: z.string().trim().min(3).max(500),
  })
  .superRefine((social, ctx) => {
    const valid =
      social.network === 'EMAIL'
        ? z.email().safeParse(social.url.replace(/^mailto:/i, '')).success
        : httpUrl.safeParse(social.url).success
    if (!valid) {
      ctx.addIssue({
        code: 'custom',
        path: ['url'],
        message:
          social.network === 'EMAIL'
            ? 'Informe um e-mail válido'
            : 'Use um endereço http ou https',
      })
    }
  })
  .meta({ id: 'SocialLinkInput' })

// Ordem salva em lote depois de arrastar: seções, e links com a seção de cada
export const linkOrderInputSchema = z
  .object({
    sections: z.array(uuidSchema).max(50),
    links: z
      .array(z.object({ id: uuidSchema, sectionId: uuidSchema.nullable() }))
      .max(200),
    socialLinks: z.array(uuidSchema).max(20).default([]),
  })
  .meta({ id: 'LinkOrderInput' })

// ?src= dos cliques e das visitas
export const linkSourceQuerySchema = z.object({
  src: z.string().toUpperCase().pipe(linkTrafficSourceSchema).default('PAGE'),
})

export const linkStatsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(7), z.literal(30)]))
    .default(7),
})

// ——— Saída ———

const settingsView = {
  slug: slugSchema,
  bio: z.string().nullable(),
  avatarFileId: uuidSchema.nullable(),
  avatarIcon: z.string().nullable(),
  coverFileId: uuidSchema.nullable(),
  theme: linkPageThemeSchema,
  buttonStyle: linkButtonStyleSchema,
  buttonShape: linkButtonShapeSchema,
  titleFont: linkTitleFontSchema,
}

const linkView = {
  id: uuidSchema,
  sectionId: uuidSchema.nullable(),
  kind: linkKindSchema,
  label: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  thumbnailFileId: uuidSchema.nullable(),
  isFeatured: z.boolean(),
  badge: linkBadgeSchema,
  openInSameTab: z.boolean(),
}

export const socialLinkSchema = z
  .object({
    id: uuidSchema,
    network: socialNetworkSchema,
    url: z.string(),
    position: z.int().nonnegative(),
  })
  .meta({ id: 'SocialLink' })

// Página pública: só o que está publicado, visível e no período
export const publicLinkPageSchema = z
  .object({
    ...settingsView,
    course: z.object({ slug: slugSchema, name: z.string() }),
    socialLinks: z.array(socialLinkSchema),
    // O destaque, se houver, vem primeiro; os links sem seção, no topo
    links: z.array(
      z.object({
        ...linkView,
        // Arquivo (FILE) para mostrar o selo "PDF"
        fileMime: z.string().nullable(),
      }),
    ),
    sections: z.array(z.object({ id: uuidSchema, title: z.string() })),
  })
  .meta({ id: 'PublicLinkPage' })

// Os primeiros links visíveis, para o hub
export const linkPagePreviewSchema = z
  .object({
    slug: slugSchema,
    links: z.array(z.object(linkView)),
  })
  .meta({ id: 'LinkPagePreview' })

// Situação do link no editor
export const linkScheduleStatusSchema = z.enum([
  'ACTIVE',
  'HIDDEN',
  'SCHEDULED',
  'EXPIRED',
])

export const managedLinkSchema = z
  .object({
    ...linkView,
    url: z.string().nullable(),
    fileId: uuidSchema.nullable(),
    internalTarget: internalTargetSchema.nullable(),
    postId: uuidSchema.nullable(),
    visibleFrom: isoDateTimeSchema.nullable(),
    visibleUntil: isoDateTimeSchema.nullable(),
    isVisible: z.boolean(),
    position: z.int().nonnegative(),
    status: linkScheduleStatusSchema,
    clicks7d: z.int().nonnegative(),
  })
  .meta({ id: 'ManagedLink' })

export const managedLinkPageSchema = z
  .object({
    ...settingsView,
    courseId: uuidSchema,
    isPublished: z.boolean(),
    updatedAt: isoDateTimeSchema,
    sections: z.array(
      z.object({
        id: uuidSchema,
        title: z.string(),
        isVisible: z.boolean(),
        position: z.int().nonnegative(),
      }),
    ),
    links: z.array(managedLinkSchema),
    socialLinks: z.array(socialLinkSchema),
  })
  .meta({ id: 'ManagedLinkPage' })

export const linkStatsSchema = z
  .object({
    days: z.int(),
    views: z.array(
      z.object({
        day: z.iso.date(),
        source: linkTrafficSourceSchema,
        count: z.int().nonnegative(),
      }),
    ),
    // Mais clicados primeiro
    links: z.array(
      z.object({
        linkId: uuidSchema,
        label: z.string(),
        clicks: z.int().nonnegative(),
        bySource: z.partialRecord(
          linkTrafficSourceSchema,
          z.int().nonnegative(),
        ),
      }),
    ),
  })
  .meta({ id: 'LinkStats' })

export const linkViewInputSchema = z
  .object({ source: linkTrafficSourceSchema })
  .meta({ id: 'LinkViewInput' })

export type InternalTarget = z.infer<typeof internalTargetSchema>
export type LinkPageSettingsInput = z.input<typeof linkPageSettingsInputSchema>
export type ParsedLinkPageSettings = z.output<
  typeof linkPageSettingsInputSchema
>
export type LinkSectionInput = z.input<typeof linkSectionInputSchema>
export type ParsedLinkSection = z.output<typeof linkSectionInputSchema>
export type LinkInput = z.input<typeof linkInputSchema>
export type ParsedLinkInput = z.output<typeof linkInputSchema>
export type SocialLinkInput = z.infer<typeof socialLinkInputSchema>
export type LinkOrderInput = z.input<typeof linkOrderInputSchema>
export type ParsedLinkOrder = z.output<typeof linkOrderInputSchema>
export type LinkScheduleStatus = z.infer<typeof linkScheduleStatusSchema>
export type SocialLinkView = z.infer<typeof socialLinkSchema>
export type PublicLinkPage = z.infer<typeof publicLinkPageSchema>
export type LinkPagePreview = z.infer<typeof linkPagePreviewSchema>
export type ManagedLink = z.infer<typeof managedLinkSchema>
export type ManagedLinkPage = z.infer<typeof managedLinkPageSchema>
export type LinkStats = z.infer<typeof linkStatsSchema>
