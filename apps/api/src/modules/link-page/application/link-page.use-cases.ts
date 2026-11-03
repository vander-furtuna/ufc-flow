import { Inject, Injectable } from '@nestjs/common'
import type {
  FilePurpose,
  LinkPagePreview,
  LinkStats,
  LinkTrafficSource,
  ManagedLinkPage,
  ParsedLinkInput,
  ParsedLinkOrder,
  ParsedLinkPageSettings,
  ParsedLinkSection,
  PublicLinkPage,
  SocialLinkInput,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { FilesErrors } from '../../files/domain/errors'
import {
  attachFile,
  checkAttachable,
  markDeleted,
} from '../../files/domain/file'
import { LinkPageErrors } from '../domain/errors'
import {
  applyOrder,
  defaultPage,
  isPubliclyVisible,
  linkStatus,
  linkTarget,
  publicOrder,
  socialUrl,
  type CourseLink,
  type LinkPage,
} from '../domain/link-page'
import {
  LINK_PAGE_UOW,
  type LinkCourse,
  type LinkPageRepositories,
  type LinkPageUnitOfWork,
} from '../domain/ports'

const DAY_MS = 24 * 60 * 60 * 1000
const PREVIEW_LIMIT = 5
const isoDay = (date: Date) => date.toISOString().slice(0, 10)
const daysAgo = (now: Date, days: number) =>
  isoDay(new Date(now.getTime() - days * DAY_MS))
const iso = (date: Date | null) => (date ? date.toISOString() : null)

// O segundo com o mesmo endereço ganha "-2", e assim por diante
function uniqueSlug(base: string, taken: ReadonlySet<string>) {
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

async function managedCourse(
  repos: LinkPageRepositories,
  actor: Actor,
  courseSlug: string,
): Promise<LinkCourse> {
  const course = await repos.context.findCourse(courseSlug)
  if (!course?.isActive) throw LinkPageErrors.courseNotFound()
  if (!AccessPolicy.canManageHub(actor, course.id)) {
    throw LinkPageErrors.accessDenied()
  }
  return course
}

// A página nasce no primeiro acesso de quem modera, com o slug do curso (D86)
async function pageOf(
  repos: LinkPageRepositories,
  course: LinkCourse,
  actor: Actor,
  now: Date,
): Promise<LinkPage> {
  const existing = await repos.pages.findByCourse(course.id)
  if (existing) return existing
  const page = defaultPage(
    course.id,
    uniqueSlug(course.slug, await repos.pages.slugsLike(course.slug)),
    actor.userId!,
    now,
  )
  await repos.pages.save(page)
  return page
}

// Liga o arquivo novo (do curso, de quem envia) e solta o anterior
async function swapFile(
  repos: LinkPageRepositories,
  actor: Actor,
  courseId: string,
  previous: string | null,
  next: string | null,
  purpose: FilePurpose,
  now: Date,
) {
  if (previous === next) return
  if (next) {
    const file = await repos.files.findById(next)
    if (!file || file.courseId !== courseId) throw FilesErrors.fileNotFound()
    checkAttachable(file, { ownerId: actor.userId!, purpose })
    await repos.files.save(attachFile(file, now))
  }
  if (previous) {
    const file = await repos.files.findById(previous)
    if (file) await repos.files.save(markDeleted(file, now))
  }
}

async function managedView(
  repos: LinkPageRepositories,
  page: LinkPage,
  now: Date,
): Promise<ManagedLinkPage> {
  const sections = await repos.sections.list(page.courseId)
  const links = await repos.links.list(page.courseId)
  const clicks = new Map<string, number>()
  for (const row of await repos.stats.clicksSince(
    page.courseId,
    daysAgo(now, 6),
  )) {
    clicks.set(row.linkId, (clicks.get(row.linkId) ?? 0) + row.clicks)
  }
  return {
    courseId: page.courseId,
    slug: page.slug,
    bio: page.bio,
    avatarFileId: page.avatarFileId,
    avatarIcon: page.avatarIcon,
    coverFileId: page.coverFileId,
    theme: page.theme,
    buttonStyle: page.buttonStyle,
    buttonShape: page.buttonShape,
    titleFont: page.titleFont,
    isPublished: page.isPublished,
    updatedAt: page.updatedAt.toISOString(),
    sections: sections
      .sort((a, b) => a.position - b.position)
      .map(({ courseId: _course, ...section }) => section),
    links: publicOrder(links, sections).map((link) => ({
      id: link.id,
      sectionId: link.sectionId,
      kind: link.kind,
      label: link.label,
      description: link.description,
      icon: link.icon,
      thumbnailFileId: link.thumbnailFileId,
      isFeatured: link.isFeatured,
      badge: link.badge,
      openInSameTab: link.openInSameTab,
      url: link.url,
      fileId: link.fileId,
      internalTarget: link.internalTarget,
      postId: link.postId,
      visibleFrom: iso(link.visibleFrom),
      visibleUntil: iso(link.visibleUntil),
      isVisible: link.isVisible,
      position: link.position,
      status: linkStatus(link, now),
      clicks7d: clicks.get(link.id) ?? 0,
    })),
    socialLinks: (await repos.socialLinks.list(page.courseId))
      .sort((a, b) => a.position - b.position)
      .map(({ courseId: _course, ...social }) => social),
  }
}

// Base das leituras públicas: só página publicada de curso ativo
async function publishedPage(repos: LinkPageRepositories, slug: string) {
  const page = await repos.pages.findBySlug(slug)
  const course = page && (await repos.context.findCourseById(page.courseId))
  if (!page?.isPublished || !course?.isActive) {
    throw LinkPageErrors.pageNotFound()
  }
  return { page, course }
}

// Links que o público vê, em ordem, com os posts que eles apontam
async function visibleLinks(
  repos: LinkPageRepositories,
  courseId: string,
  now: Date,
) {
  const sections = await repos.sections.list(courseId)
  const links = await repos.links.list(courseId)
  const posts = new Map(
    (
      await repos.context.findPosts(
        links.flatMap((link) => (link.postId ? [link.postId] : [])),
      )
    ).map((post) => [post.id, post]),
  )
  const visible = links.filter((link) =>
    isPubliclyVisible(
      link,
      sections,
      now,
      link.postId ? posts.get(link.postId)?.published === true : true,
    ),
  )
  return { sections, links: publicOrder(visible, sections), posts }
}

const publicLink = (link: CourseLink) => ({
  id: link.id,
  sectionId: link.sectionId,
  kind: link.kind,
  label: link.label,
  description: link.description,
  icon: link.icon,
  thumbnailFileId: link.thumbnailFileId,
  isFeatured: link.isFeatured,
  badge: link.badge,
  openInSameTab: link.openInSameTab,
})

@Injectable()
export class ManageLinkPageUseCase {
  constructor(
    @Inject(LINK_PAGE_UOW) private readonly uow: LinkPageUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  // Abre o editor; cria a página na primeira vez
  get(actor: Actor, courseSlug: string): Promise<ManagedLinkPage> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const now = this.clock.now()
      return managedView(repos, await pageOf(repos, course, actor, now), now)
    })
  }

  updateSettings(
    actor: Actor,
    courseSlug: string,
    input: ParsedLinkPageSettings,
  ): Promise<ManagedLinkPage> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const now = this.clock.now()
      const page = await pageOf(repos, course, actor, now)
      if (input.slug !== page.slug) {
        const owner = await repos.pages.findBySlug(input.slug)
        if (owner && owner.courseId !== course.id) {
          throw LinkPageErrors.slugTaken()
        }
      }
      for (const field of ['avatarFileId', 'coverFileId'] as const) {
        await swapFile(
          repos,
          actor,
          course.id,
          page[field],
          input[field],
          'LINK_PAGE_IMAGE',
          now,
        )
      }
      const saved: LinkPage = {
        ...page,
        ...input,
        updatedBy: actor.userId,
        updatedAt: now,
      }
      await repos.pages.save(saved)
      return managedView(repos, saved, now)
    })
  }

  saveSection(
    actor: Actor,
    courseSlug: string,
    sectionId: string | null,
    input: ParsedLinkSection,
  ): Promise<ManagedLinkPage> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const now = this.clock.now()
      const page = await pageOf(repos, course, actor, now)
      const sections = await repos.sections.list(course.id)
      const current = sectionId
        ? sections.find((section) => section.id === sectionId)
        : null
      if (sectionId && !current) throw LinkPageErrors.sectionNotFound()
      await repos.sections.save({
        id: current?.id ?? this.ids.next(),
        courseId: course.id,
        position:
          current?.position ??
          Math.max(-1, ...sections.map((section) => section.position)) + 1,
        ...input,
      })
      return managedView(repos, page, now)
    })
  }

  // Os links da seção ficam, sem seção (no topo)
  removeSection(
    actor: Actor,
    courseSlug: string,
    sectionId: string,
  ): Promise<ManagedLinkPage> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const now = this.clock.now()
      const page = await pageOf(repos, course, actor, now)
      const sections = await repos.sections.list(course.id)
      if (!sections.some((section) => section.id === sectionId)) {
        throw LinkPageErrors.sectionNotFound()
      }
      await repos.sections.delete(sectionId)
      return managedView(repos, page, now)
    })
  }

  saveLink(
    actor: Actor,
    courseSlug: string,
    linkId: string | null,
    input: ParsedLinkInput,
  ): Promise<ManagedLinkPage> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const now = this.clock.now()
      const page = await pageOf(repos, course, actor, now)
      const links = await repos.links.list(course.id)
      const current = linkId ? links.find((link) => link.id === linkId) : null
      if (linkId && !current) throw LinkPageErrors.linkNotFound()
      if (
        input.sectionId &&
        !(await repos.sections.list(course.id)).some(
          (section) => section.id === input.sectionId,
        )
      ) {
        throw LinkPageErrors.sectionNotFound()
      }
      if (input.postId) {
        const [post] = await repos.context.findPosts([input.postId])
        if (!post || (post.courseId !== null && post.courseId !== course.id)) {
          throw LinkPageErrors.postNotFound()
        }
      }
      await swapFile(
        repos,
        actor,
        course.id,
        current?.thumbnailFileId ?? null,
        input.thumbnailFileId,
        'LINK_THUMBNAIL',
        now,
      )
      await swapFile(
        repos,
        actor,
        course.id,
        current?.fileId ?? null,
        input.fileId,
        'LINK_FILE',
        now,
      )
      // No máximo um destaque por página: o novo desmarca o anterior
      if (input.isFeatured) {
        for (const other of links) {
          if (other.isFeatured && other.id !== linkId) {
            await repos.links.save({ ...other, isFeatured: false })
          }
        }
      }
      const sameSection = links.filter(
        (link) => link.sectionId === input.sectionId && link.id !== linkId,
      )
      await repos.links.save({
        ...input,
        id: current?.id ?? this.ids.next(),
        courseId: course.id,
        visibleFrom: input.visibleFrom ? new Date(input.visibleFrom) : null,
        visibleUntil: input.visibleUntil ? new Date(input.visibleUntil) : null,
        position:
          current && current.sectionId === input.sectionId
            ? current.position
            : Math.max(-1, ...sameSection.map((link) => link.position)) + 1,
        createdBy: current?.createdBy ?? actor.userId,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      })
      return managedView(repos, page, now)
    })
  }

  removeLink(
    actor: Actor,
    courseSlug: string,
    linkId: string,
  ): Promise<ManagedLinkPage> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const now = this.clock.now()
      const page = await pageOf(repos, course, actor, now)
      const link = (await repos.links.list(course.id)).find(
        (item) => item.id === linkId,
      )
      if (!link) throw LinkPageErrors.linkNotFound()
      await repos.links.delete(link.id)
      for (const [previous, purpose] of [
        [link.thumbnailFileId, 'LINK_THUMBNAIL'],
        [link.fileId, 'LINK_FILE'],
      ] as const) {
        await swapFile(repos, actor, course.id, previous, null, purpose, now)
      }
      return managedView(repos, page, now)
    })
  }

  saveSocialLink(
    actor: Actor,
    courseSlug: string,
    socialId: string | null,
    input: SocialLinkInput,
  ): Promise<ManagedLinkPage> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const now = this.clock.now()
      const page = await pageOf(repos, course, actor, now)
      const socials = await repos.socialLinks.list(course.id)
      const current = socialId
        ? socials.find((social) => social.id === socialId)
        : null
      if (socialId && !current) throw LinkPageErrors.socialLinkNotFound()
      await repos.socialLinks.save({
        id: current?.id ?? this.ids.next(),
        courseId: course.id,
        network: input.network,
        url: socialUrl(input.network, input.url),
        position:
          current?.position ??
          Math.max(-1, ...socials.map((social) => social.position)) + 1,
      })
      return managedView(repos, page, now)
    })
  }

  removeSocialLink(
    actor: Actor,
    courseSlug: string,
    socialId: string,
  ): Promise<ManagedLinkPage> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const now = this.clock.now()
      const page = await pageOf(repos, course, actor, now)
      if (
        !(await repos.socialLinks.list(course.id)).some(
          (social) => social.id === socialId,
        )
      ) {
        throw LinkPageErrors.socialLinkNotFound()
      }
      await repos.socialLinks.delete(socialId)
      return managedView(repos, page, now)
    })
  }

  // Ordem em lote, depois de arrastar
  setOrder(
    actor: Actor,
    courseSlug: string,
    order: ParsedLinkOrder,
  ): Promise<ManagedLinkPage> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const now = this.clock.now()
      const page = await pageOf(repos, course, actor, now)
      const ordered = applyOrder(
        {
          sections: await repos.sections.list(course.id),
          links: await repos.links.list(course.id),
          socialLinks: await repos.socialLinks.list(course.id),
        },
        order,
      )
      for (const section of ordered.sections) await repos.sections.save(section)
      for (const link of ordered.links) await repos.links.save(link)
      for (const social of ordered.socialLinks) {
        await repos.socialLinks.save(social)
      }
      return managedView(repos, page, now)
    })
  }

  // Visitas por dia e origem e os links mais clicados, em 7 ou 30 dias
  stats(actor: Actor, courseSlug: string, days: number): Promise<LinkStats> {
    return this.uow.run(async (repos) => {
      const course = await managedCourse(repos, actor, courseSlug)
      const since = daysAgo(this.clock.now(), days - 1)
      const links = await repos.links.list(course.id)
      const bySource = new Map<
        string,
        Partial<Record<LinkTrafficSource, number>>
      >()
      for (const row of await repos.stats.clicksSince(course.id, since)) {
        const sources = bySource.get(row.linkId) ?? {}
        sources[row.source] = (sources[row.source] ?? 0) + row.clicks
        bySource.set(row.linkId, sources)
      }
      const total = (sources: Partial<Record<LinkTrafficSource, number>>) =>
        Object.values(sources).reduce((sum, value) => sum + value, 0)
      return {
        days,
        views: (await repos.stats.viewsSince(course.id, since)).map((row) => ({
          day: row.day,
          source: row.source,
          count: row.views,
        })),
        links: links
          .map((link) => {
            const sources = bySource.get(link.id) ?? {}
            return {
              linkId: link.id,
              label: link.label,
              clicks: total(sources),
              bySource: sources,
            }
          })
          .sort(
            (a, b) => b.clicks - a.clicks || a.label.localeCompare(b.label),
          ),
      }
    })
  }
}

@Injectable()
export class PublicLinkPageUseCase {
  constructor(
    @Inject(LINK_PAGE_UOW) private readonly uow: LinkPageUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Só o que está publicado, visível e dentro do período
  page(slug: string): Promise<PublicLinkPage> {
    return this.uow.run(async (repos) => {
      const { page, course } = await publishedPage(repos, slug)
      const { sections, links } = await visibleLinks(
        repos,
        course.id,
        this.clock.now(),
      )
      const mimes = await repos.context.fileMimes(
        links.flatMap((link) => (link.fileId ? [link.fileId] : [])),
      )
      const used = new Set(links.map((link) => link.sectionId))
      return {
        slug: page.slug,
        bio: page.bio,
        avatarFileId: page.avatarFileId,
        avatarIcon: page.avatarIcon,
        coverFileId: page.coverFileId,
        theme: page.theme,
        buttonStyle: page.buttonStyle,
        buttonShape: page.buttonShape,
        titleFont: page.titleFont,
        course: { slug: course.slug, name: course.name },
        socialLinks: (await repos.socialLinks.list(course.id))
          .sort((a, b) => a.position - b.position)
          .map(({ courseId: _course, ...social }) => social),
        links: links.map((link) => ({
          ...publicLink(link),
          fileMime: link.fileId ? (mimes.get(link.fileId) ?? null) : null,
        })),
        sections: sections
          .filter((section) => section.isVisible && used.has(section.id))
          .sort((a, b) => a.position - b.position)
          .map((section) => ({ id: section.id, title: section.title })),
      }
    })
  }

  // Os primeiros links visíveis, para o hub do curso
  preview(courseSlug: string): Promise<LinkPagePreview> {
    return this.uow.run(async (repos) => {
      const course = await repos.context.findCourse(courseSlug)
      const page = course && (await repos.pages.findByCourse(course.id))
      if (!course?.isActive || !page?.isPublished) {
        throw LinkPageErrors.pageNotFound()
      }
      const { links } = await visibleLinks(repos, course.id, this.clock.now())
      return {
        slug: page.slug,
        links: links.slice(0, PREVIEW_LIMIT).map(publicLink),
      }
    })
  }

  // Soma o clique (por dia e origem) e devolve o destino do redirecionamento
  click(
    slug: string,
    linkId: string,
    source: LinkTrafficSource,
  ): Promise<string> {
    return this.uow.run(async (repos) => {
      const { course } = await publishedPage(repos, slug)
      const now = this.clock.now()
      const { links, posts } = await visibleLinks(repos, course.id, now)
      const link = links.find((item) => item.id === linkId)
      if (!link) throw LinkPageErrors.linkNotFound()
      await repos.stats.addClick(link.id, isoDay(now), source)
      return linkTarget(link, {
        courseSlug: course.slug,
        curriculumSlug: await repos.context.currentCurriculumSlug(course.id),
        postSlug: link.postId ? (posts.get(link.postId)?.slug ?? null) : null,
      })
    })
  }

  view(slug: string, source: LinkTrafficSource): Promise<void> {
    return this.uow.run(async (repos) => {
      const { course } = await publishedPage(repos, slug)
      await repos.stats.addView(course.id, isoDay(this.clock.now()), source)
    })
  }
}
