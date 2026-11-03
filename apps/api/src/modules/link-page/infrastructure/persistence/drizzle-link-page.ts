import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gte, inArray, isNull, like, sql } from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import type { Executor } from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import {
  courses,
  curricula,
} from '../../../catalog/infrastructure/persistence/catalog.schema'
import { fileAttachmentRepository } from '../../../files/infrastructure/persistence/drizzle-files'
import { files } from '../../../files/infrastructure/persistence/files.schema'
import { posts } from '../../../hub/infrastructure/persistence/hub.schema'
import type { CourseLink, LinkPage } from '../../domain/link-page'
import type {
  LinkPageRepositories,
  LinkPageUnitOfWork,
} from '../../domain/ports'
import {
  courseLinkPages,
  courseLinkSections,
  courseLinks,
  courseSocialLinks,
  linkClicksDaily,
  linkPageViewsDaily,
} from './link-page.schema'

const courseInfo = {
  id: courses.id,
  slug: courses.slug,
  name: courses.name,
  isActive: courses.isActive,
}

function linkPageRepositories(db: Executor): LinkPageRepositories {
  return {
    pages: {
      async findByCourse(courseId) {
        const [row] = await db
          .select()
          .from(courseLinkPages)
          .where(eq(courseLinkPages.courseId, courseId))
        return (row as LinkPage | undefined) ?? null
      },
      async findBySlug(slug) {
        const [row] = await db
          .select()
          .from(courseLinkPages)
          .where(eq(courseLinkPages.slug, slug))
        return (row as LinkPage | undefined) ?? null
      },
      async slugsLike(base) {
        const rows = await db
          .select({ slug: courseLinkPages.slug })
          .from(courseLinkPages)
          .where(
            like(courseLinkPages.slug, `${base.replace(/[\\%_]/g, '\\$&')}%`),
          )
        return new Set(rows.map((row) => row.slug))
      },
      async save(page) {
        const { courseId: _courseId, ...changes } = page
        await db.insert(courseLinkPages).values(page).onConflictDoUpdate({
          target: courseLinkPages.courseId,
          set: changes,
        })
      },
    },
    sections: {
      async list(courseId) {
        return db
          .select()
          .from(courseLinkSections)
          .where(eq(courseLinkSections.courseId, courseId))
      },
      async save(section) {
        const { id: _id, ...changes } = section
        await db
          .insert(courseLinkSections)
          .values(section)
          .onConflictDoUpdate({ target: courseLinkSections.id, set: changes })
      },
      async delete(id) {
        await db.delete(courseLinkSections).where(eq(courseLinkSections.id, id))
      },
    },
    links: {
      async list(courseId) {
        return (await db
          .select()
          .from(courseLinks)
          .where(eq(courseLinks.courseId, courseId))) as CourseLink[]
      },
      async save(link) {
        const { id: _id, createdAt: _created, ...changes } = link
        await db
          .insert(courseLinks)
          .values(link)
          .onConflictDoUpdate({ target: courseLinks.id, set: changes })
      },
      async delete(id) {
        await db.delete(courseLinks).where(eq(courseLinks.id, id))
      },
    },
    socialLinks: {
      async list(courseId) {
        return db
          .select()
          .from(courseSocialLinks)
          .where(eq(courseSocialLinks.courseId, courseId))
      },
      async save(social) {
        const { id: _id, ...changes } = social
        await db
          .insert(courseSocialLinks)
          .values(social)
          .onConflictDoUpdate({ target: courseSocialLinks.id, set: changes })
      },
      async delete(id) {
        await db.delete(courseSocialLinks).where(eq(courseSocialLinks.id, id))
      },
    },
    stats: {
      async addClick(linkId, day, source) {
        await db
          .insert(linkClicksDaily)
          .values({ linkId, day, source, clicks: 1 })
          .onConflictDoUpdate({
            target: [
              linkClicksDaily.linkId,
              linkClicksDaily.day,
              linkClicksDaily.source,
            ],
            set: { clicks: sql`${linkClicksDaily.clicks} + 1` },
          })
      },
      async addView(courseId, day, source) {
        await db
          .insert(linkPageViewsDaily)
          .values({ courseId, day, source, views: 1 })
          .onConflictDoUpdate({
            target: [
              linkPageViewsDaily.courseId,
              linkPageViewsDaily.day,
              linkPageViewsDaily.source,
            ],
            set: { views: sql`${linkPageViewsDaily.views} + 1` },
          })
      },
      async clicksSince(courseId, day) {
        return db
          .select({
            linkId: linkClicksDaily.linkId,
            source: linkClicksDaily.source,
            clicks: linkClicksDaily.clicks,
          })
          .from(linkClicksDaily)
          .innerJoin(courseLinks, eq(courseLinks.id, linkClicksDaily.linkId))
          .where(
            and(
              eq(courseLinks.courseId, courseId),
              gte(linkClicksDaily.day, day),
            ),
          )
      },
      async viewsSince(courseId, day) {
        return db
          .select({
            day: linkPageViewsDaily.day,
            source: linkPageViewsDaily.source,
            views: linkPageViewsDaily.views,
          })
          .from(linkPageViewsDaily)
          .where(
            and(
              eq(linkPageViewsDaily.courseId, courseId),
              gte(linkPageViewsDaily.day, day),
            ),
          )
          .orderBy(linkPageViewsDaily.day, linkPageViewsDaily.source)
      },
    },
    context: {
      async findCourse(slug) {
        const [row] = await db
          .select(courseInfo)
          .from(courses)
          .where(eq(courses.slug, slug))
        return row ?? null
      },
      async findCourseById(id) {
        const [row] = await db
          .select(courseInfo)
          .from(courses)
          .where(eq(courses.id, id))
        return row ?? null
      },
      async currentCurriculumSlug(courseId) {
        const [row] = await db
          .select({ slug: curricula.slug })
          .from(curricula)
          .where(
            and(
              eq(curricula.courseId, courseId),
              eq(curricula.isCurrent, true),
            ),
          )
        return row?.slug ?? null
      },
      async findPosts(ids) {
        if (ids.length === 0) return []
        const rows = await db
          .select({
            id: posts.id,
            courseId: posts.courseId,
            slug: posts.slug,
            status: posts.status,
          })
          .from(posts)
          .where(and(inArray(posts.id, [...ids]), isNull(posts.deletedAt)))
        return rows.map(({ status, ...post }) => ({
          ...post,
          published: status === 'PUBLISHED',
        }))
      },
      async fileMimes(ids) {
        if (ids.length === 0) return new Map()
        const rows = await db
          .select({ id: files.id, mime: files.mimeType })
          .from(files)
          .where(inArray(files.id, [...ids]))
        return new Map(rows.map((row) => [row.id, row.mime]))
      },
    },
    files: fileAttachmentRepository(db),
  }
}

@Injectable()
export class DrizzleLinkPageUnitOfWork implements LinkPageUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: LinkPageRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(linkPageRepositories(tx)))
  }
}
