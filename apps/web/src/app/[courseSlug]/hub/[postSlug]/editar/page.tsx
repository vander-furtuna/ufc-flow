import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { getHubPost } from '@/lib/hub/hub-server'
import { postFormFromView } from '@/lib/hub/post-form'

import { PostFormPage } from '../../post-form-page'

export const metadata: Metadata = {
  title: 'Editar post',
  robots: { index: false },
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseSlug: string; postSlug: string }>
}) {
  const { courseSlug, postSlug } = await params
  const path = `/${courseSlug}/hub/${postSlug}/editar`
  // Sem login, o rascunho daria 404: entra primeiro
  if (!(await getCurrentUser())) {
    redirect(`/entrar?next=${encodeURIComponent(path)}`)
  }
  const post = await getHubPost(courseSlug, postSlug)
  return (
    <PostFormPage
      courseSlug={courseSlug}
      path={path}
      title="Editar post"
      initial={postFormFromView(post)}
      post={{
        id: post.id,
        slug: post.slug,
        institutional: post.courseId === null,
      }}
    />
  )
}
