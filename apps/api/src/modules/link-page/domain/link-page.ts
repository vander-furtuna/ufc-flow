import type {
  InternalTarget,
  LinkBadge,
  LinkButtonShape,
  LinkButtonStyle,
  LinkKind,
  LinkPageTheme,
  LinkScheduleStatus,
  LinkTitleFont,
  ParsedLinkOrder,
  SocialNetwork,
} from '@ufc-flow/contracts'

import { LinkPageErrors } from './errors'

export type LinkPage = {
  courseId: string
  slug: string
  bio: string | null
  avatarFileId: string | null
  avatarIcon: string | null
  coverFileId: string | null
  theme: LinkPageTheme
  buttonStyle: LinkButtonStyle
  buttonShape: LinkButtonShape
  titleFont: LinkTitleFont
  isPublished: boolean
  updatedBy: string | null
  updatedAt: Date
}

export type LinkSection = {
  id: string
  courseId: string
  title: string
  position: number
  isVisible: boolean
}

export type CourseLink = {
  id: string
  courseId: string
  sectionId: string | null
  kind: LinkKind
  label: string
  description: string | null
  url: string | null
  fileId: string | null
  internalTarget: InternalTarget | null
  postId: string | null
  icon: string | null
  thumbnailFileId: string | null
  isFeatured: boolean
  badge: LinkBadge
  openInSameTab: boolean
  visibleFrom: Date | null
  visibleUntil: Date | null
  isVisible: boolean
  position: number
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export type SocialLink = {
  id: string
  courseId: string
  network: SocialNetwork
  url: string
  position: number
}

// A página nasce no primeiro acesso de quem modera, despublicada (D86)
export const defaultPage = (
  courseId: string,
  slug: string,
  userId: string,
  now: Date,
): LinkPage => ({
  courseId,
  slug,
  bio: null,
  avatarFileId: null,
  avatarIcon: null,
  coverFileId: null,
  theme: 'CIANO',
  buttonStyle: 'SOFT',
  buttonShape: 'ROUNDED',
  titleFont: 'CLASH',
  isPublished: false,
  updatedBy: userId,
  updatedAt: now,
})

// "programado" ou "expirado" no editor; fora do período o link some sozinho
export function linkStatus(
  link: Pick<CourseLink, 'isVisible' | 'visibleFrom' | 'visibleUntil'>,
  now: Date,
): LinkScheduleStatus {
  if (!link.isVisible) return 'HIDDEN'
  if (link.visibleFrom && link.visibleFrom > now) return 'SCHEDULED'
  if (link.visibleUntil && link.visibleUntil <= now) return 'EXPIRED'
  return 'ACTIVE'
}

// Ativo, fora de seção oculta e, se aponta para post, com o post publicado
export function isPubliclyVisible(
  link: CourseLink,
  sections: readonly LinkSection[],
  now: Date,
  postPublished: boolean,
): boolean {
  if (linkStatus(link, now) !== 'ACTIVE') return false
  if (link.kind === 'POST' && !postPublished) return false
  if (link.sectionId === null) return true
  return sections.some(
    (section) => section.id === link.sectionId && section.isVisible,
  )
}

// Destaque no topo, depois os links sem seção e as seções em ordem
export function publicOrder<T extends CourseLink>(
  links: readonly T[],
  sections: readonly LinkSection[],
): T[] {
  const byPosition = (a: T, b: T) => a.position - b.position
  const sectionRank = new Map(
    [...sections]
      .sort((a, b) => a.position - b.position)
      .map((section, index) => [section.id, index]),
  )
  const rank = (link: T) => sectionRank.get(link.sectionId!) ?? Infinity
  const rest = links.filter((link) => !link.isFeatured)
  return [
    ...links.filter((link) => link.isFeatured),
    ...rest.filter((link) => link.sectionId === null).sort(byPosition),
    ...rest
      .filter((link) => link.sectionId !== null)
      .sort((a, b) => rank(a) - rank(b) || byPosition(a, b)),
  ]
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id))

// Ordem depois de arrastar: todas as seções, links e redes, uma vez cada
export function applyOrder(
  current: {
    sections: readonly LinkSection[]
    links: readonly CourseLink[]
    socialLinks: readonly SocialLink[]
  },
  order: ParsedLinkOrder,
) {
  const sectionIds = current.sections.map((section) => section.id)
  const valid =
    sameSet(order.sections, sectionIds) &&
    sameSet(
      order.links.map((item) => item.id),
      current.links.map((link) => link.id),
    ) &&
    sameSet(
      order.socialLinks,
      current.socialLinks.map((social) => social.id),
    ) &&
    order.links.every(
      (item) => item.sectionId === null || sectionIds.includes(item.sectionId),
    )
  if (!valid) throw LinkPageErrors.orderMismatch()

  const positions = new Map<string | null, number>()
  return {
    sections: order.sections.map((id, position) => ({
      ...current.sections.find((section) => section.id === id)!,
      position,
    })),
    links: order.links.map(({ id, sectionId }) => {
      const position = positions.get(sectionId) ?? 0
      positions.set(sectionId, position + 1)
      return {
        ...current.links.find((link) => link.id === id)!,
        sectionId,
        position,
      }
    }),
    socialLinks: order.socialLinks.map((id, position) => ({
      ...current.socialLinks.find((social) => social.id === id)!,
      position,
    })),
  }
}

type TargetContext = {
  courseSlug: string
  curriculumSlug: string | null
  postSlug: string | null
}

const INTERNAL_PATHS: Record<InternalTarget, (ctx: TargetContext) => string> = {
  GRADE: ({ courseSlug, curriculumSlug }) =>
    curriculumSlug ? `/${courseSlug}/${curriculumSlug}` : '/cursos',
  AGENDA: ({ courseSlug, curriculumSlug }) =>
    curriculumSlug ? `/${courseSlug}/${curriculumSlug}/agenda` : '/cursos',
  HUB: ({ courseSlug }) => `/${courseSlug}/hub`,
  CALENDARIO: () => '/calendario',
  RU: () => '/restaurante',
}

// Para onde o clique vai: endereço externo ou caminho do web
export function linkTarget(link: CourseLink, ctx: TargetContext): string {
  switch (link.kind) {
    case 'URL':
      return link.url!
    case 'FILE':
      return `/arquivos/${link.fileId}`
    case 'POST':
      return `/${ctx.courseSlug}/hub/${ctx.postSlug}`
    case 'INTERNAL':
      return INTERNAL_PATHS[link.internalTarget!](ctx)
  }
}

// E-mail guardado como mailto:, para o ícone abrir o cliente de e-mail
export const socialUrl = (network: SocialNetwork, url: string) =>
  network === 'EMAIL' ? `mailto:${url.replace(/^mailto:/i, '')}` : url
