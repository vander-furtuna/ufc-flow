import type { HubFeed, ManagedLinkPage } from '@ufc-flow/contracts'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { Header } from '@/components/header'
import { LinkEditor } from '@/components/link-page/link-editor'
import { SimplePage } from '@/components/simple-page'
import { getCurrentUser } from '@/lib/auth/session'
import { userFetch } from '@/lib/auth/user-api'
import { canManageHub } from '@/lib/hub/hub-server'

import { hubCourse } from '../course'

export const metadata: Metadata = {
  title: 'Página de links',
  robots: { index: false },
}

// Editor da página de links, para a moderação do curso e admins
export default async function Page({
  params,
}: {
  params: Promise<{ courseSlug: string }>
}) {
  const { courseSlug } = await params
  const [course, user] = await Promise.all([
    hubCourse(courseSlug),
    getCurrentUser(),
  ])
  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(`/${courseSlug}/hub/links`)}`)
  }
  if (!canManageHub(user, course.slug)) {
    return (
      <SimplePage
        title="Sem acesso"
        subtitle="Só a moderação do curso edita a página de links."
      >
        <p className="text-muted-foreground">
          Para moderar um curso, peça a moderação a um administrador.
        </p>
      </SimplePage>
    )
  }
  const base = `/v1/courses/${encodeURIComponent(course.slug)}`
  // A página nasce no primeiro acesso (D86); os posts servem ao "+ Post do hub"
  const [page, feed] = await Promise.all([
    userFetch<ManagedLinkPage>(`${base}/link-page`),
    userFetch<HubFeed>(`${base}/hub?limit=50`),
  ])
  if (!page.ok) throw new Error(page.problem.detail ?? 'Editor indisponível')
  const posts = feed.ok ? [...feed.data.pinned, ...feed.data.items] : []

  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <div className="flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
        <Header />
        <LinkEditor
          course={{ slug: course.slug, name: course.name }}
          initial={page.data}
          posts={posts}
        />
      </div>
    </main>
  )
}
