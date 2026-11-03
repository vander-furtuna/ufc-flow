import 'server-only'

import type { Me, PostView } from '@ufc-flow/contracts'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { userFetch } from '@/lib/auth/user-api'

// Post pelo slug, como quem está logado (rascunho só para quem modera)
export const getHubPost = cache(
  async (courseSlug: string, slug: string): Promise<PostView> => {
    const result = await userFetch<PostView>(
      `/v1/courses/${encodeURIComponent(courseSlug)}/hub/posts/${encodeURIComponent(slug)}`,
    )
    if (result.ok) return result.data
    if (result.problem.status === 404 || result.problem.status === 400) {
      notFound()
    }
    throw new Error(result.problem.detail ?? 'Hub indisponível')
  },
)

export const canManageHub = (user: Me | null, courseSlug: string) =>
  Boolean(
    user &&
    (user.roles.includes('ADMIN') ||
      user.moderatedCourses.some((course) => course.slug === courseSlug)),
  )
