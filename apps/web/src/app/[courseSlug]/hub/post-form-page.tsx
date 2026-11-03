import 'server-only'

import type { CourseDetail } from '@ufc-flow/contracts'
import { notFound, redirect } from 'next/navigation'

import { Header } from '@/components/header'
import { PostForm, type PostFormProps } from '@/components/hub/post-form'
import { SimplePage } from '@/components/simple-page'
import { callApi } from '@/lib/auth/api'
import { getCurrentUser } from '@/lib/auth/session'
import { canManageHub } from '@/lib/hub/hub-server'
import type { PostFormState } from '@/lib/hub/post-form'

import { PageHeader } from '../../admin/_components/page-header'
import { hubCourse } from './course'

// Criação e edição de post, no estilo da área administrativa. Só para quem
// modera o curso ou é admin; a API confere de novo.
export async function PostFormPage({
  courseSlug,
  path,
  title,
  initial,
  post,
}: {
  courseSlug: string
  // Endereço desta página, para voltar depois de entrar
  path: string
  title: string
  initial: PostFormState
  post?: PostFormProps['post'] & { slug: string }
}) {
  const [course, user] = await Promise.all([
    hubCourse(courseSlug),
    getCurrentUser(),
  ])
  if (!user) redirect(`/entrar?next=${encodeURIComponent(path)}`)
  const isAdmin = user.roles.includes('ADMIN')
  if (!canManageHub(user, course.slug) || (post?.institutional && !isAdmin)) {
    return (
      <SimplePage
        title="Sem acesso"
        subtitle="Só a moderação do curso escreve no hub."
      >
        <p className="text-muted-foreground">
          Para moderar um curso, peça a moderação a um administrador.
        </p>
      </SimplePage>
    )
  }
  // O id do curso vai no envio da capa e da galeria
  const detail = await callApi<CourseDetail>(
    `/v1/courses/${encodeURIComponent(course.slug)}`,
  )
  if (!detail.ok) notFound()
  const hubHref = `/${course.slug}/hub`

  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <div className="flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
        <Header />
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <PageHeader
            crumbs={[
              { href: hubHref, label: `Hub de ${course.name}` },
              ...(post
                ? [{ href: `${hubHref}/${post.slug}`, label: 'Post' }]
                : []),
            ]}
            title={title}
          />
          <PostForm
            course={{ slug: course.slug, id: detail.data.id }}
            post={post && { id: post.id, institutional: post.institutional }}
            isAdmin={isAdmin}
            initial={initial}
          />
        </div>
      </div>
    </main>
  )
}
