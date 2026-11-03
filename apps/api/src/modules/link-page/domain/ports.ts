import type { LinkTrafficSource } from '@ufc-flow/contracts'

import type { FileAttachmentRepository } from '../../files/domain/ports'
import type { CourseLink, LinkPage, LinkSection, SocialLink } from './link-page'

export interface LinkPageRepository {
  findByCourse(courseId: string): Promise<LinkPage | null>
  findBySlug(slug: string): Promise<LinkPage | null>
  // Slugs já usados (por qualquer página), para a página nova e a troca
  slugsLike(base: string): Promise<Set<string>>
  save(page: LinkPage): Promise<void>
}

export interface LinkSectionRepository {
  list(courseId: string): Promise<LinkSection[]>
  save(section: LinkSection): Promise<void>
  delete(id: string): Promise<void>
}

export interface CourseLinkRepository {
  list(courseId: string): Promise<CourseLink[]>
  save(link: CourseLink): Promise<void>
  delete(id: string): Promise<void>
}

export interface SocialLinkRepository {
  list(courseId: string): Promise<SocialLink[]>
  save(social: SocialLink): Promise<void>
  delete(id: string): Promise<void>
}

// Contagens anônimas por dia e origem (sem usuário nem IP)
export interface LinkStatsRepository {
  addClick(
    linkId: string,
    day: string,
    source: LinkTrafficSource,
  ): Promise<void>
  addView(
    courseId: string,
    day: string,
    source: LinkTrafficSource,
  ): Promise<void>
  clicksSince(
    courseId: string,
    day: string,
  ): Promise<{ linkId: string; source: LinkTrafficSource; clicks: number }[]>
  viewsSince(
    courseId: string,
    day: string,
  ): Promise<{ day: string; source: LinkTrafficSource; views: number }[]>
}

export type LinkCourse = {
  id: string
  slug: string
  name: string
  isActive: boolean
}

export type LinkedPost = {
  id: string
  courseId: string | null
  slug: string
  published: boolean
}

// Leituras de outros módulos: curso, EC vigente, posts e arquivos
export interface LinkPageContext {
  findCourse(slug: string): Promise<LinkCourse | null>
  findCourseById(id: string): Promise<LinkCourse | null>
  currentCurriculumSlug(courseId: string): Promise<string | null>
  findPosts(ids: readonly string[]): Promise<LinkedPost[]>
  fileMimes(ids: readonly string[]): Promise<Map<string, string>>
}

export type LinkPageRepositories = {
  pages: LinkPageRepository
  sections: LinkSectionRepository
  links: CourseLinkRepository
  socialLinks: SocialLinkRepository
  stats: LinkStatsRepository
  context: LinkPageContext
  files: FileAttachmentRepository
}

export interface LinkPageUnitOfWork {
  run<T>(work: (repositories: LinkPageRepositories) => Promise<T>): Promise<T>
}

export const LINK_PAGE_UOW = Symbol('LinkPageUnitOfWork')
