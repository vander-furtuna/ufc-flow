import { ArrowLeftIcon, ArrowSquareOutIcon } from '@phosphor-icons/react/ssr'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Header } from '@/components/header'
import { PostMarkdown } from '@/components/hub/post-markdown'
import { PostStatusBadge, PostTypeBadge } from '@/components/hub/post-card'
import { getCurrentUser } from '@/lib/auth/session'
import { fileUrl } from '@/lib/files/upload'
import { canManageHub, getHubPost } from '@/lib/hub/hub-server'
import { fullDate, postDetails } from '@/lib/hub/post-display'

import { hubCourse } from '../course'
import { PostActions } from './post-actions'

type Props = { params: Promise<{ courseSlug: string; postSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug, postSlug } = await params
  const [course, post] = await Promise.all([
    hubCourse(courseSlug),
    getHubPost(courseSlug, postSlug),
  ])
  return {
    title: `${post.title} · ${course.name}`,
    description: post.summary ?? undefined,
    // Rascunho e arquivado não vão para busca
    robots: post.status === 'PUBLISHED' ? undefined : { index: false },
  }
}

export default async function Page({ params }: Props) {
  const { courseSlug, postSlug } = await params
  const [course, post, user] = await Promise.all([
    hubCourse(courseSlug),
    getHubPost(courseSlug, postSlug),
    getCurrentUser(),
  ])
  const details = postDetails(post)
  const hubHref = `/${course.slug}/hub`

  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <div className="flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
        <Header />

        <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <Link
            href={hubHref}
            className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            Hub de {course.name}
          </Link>

          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PostTypeBadge type={post.type} />
              <PostStatusBadge post={post} />
              {post.pinned && (
                <span className="text-xs text-muted-foreground">Fixado</span>
              )}
              {post.courseId === null && (
                <span className="text-xs text-muted-foreground">
                  Institucional
                </span>
              )}
              {post.closed && (
                <span className="text-xs font-medium text-muted-foreground">
                  Encerrado
                </span>
              )}
            </div>
            <h1 className="font-clash text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              {post.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {post.publishedAt
                ? `Publicado em ${fullDate(post.publishedAt)}`
                : 'Ainda não publicado'}
              {post.author ? ` · ${post.author.name}` : ''}
            </p>
            {canManageHub(user, course.slug) && (
              <PostActions
                postId={post.id}
                editHref={`${hubHref}/${post.slug}/editar`}
                hubHref={hubHref}
              />
            )}
          </header>

          {post.coverFileId && (
            <img
              src={fileUrl(post.coverFileId)}
              alt=""
              width={1200}
              height={675}
              className="aspect-video w-full rounded-2xl border bg-muted object-cover"
            />
          )}

          {post.summary && (
            <p className="text-lg leading-relaxed text-foreground/90">
              {post.summary}
            </p>
          )}

          {(details.length > 0 || post.externalUrl) && (
            <div className="flex flex-col gap-4 rounded-2xl border bg-muted/50 p-5">
              {details.length > 0 && (
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {details.map((detail) => (
                    <div key={detail.label} className="flex flex-col gap-0.5">
                      <dt className="text-xs font-medium text-muted-foreground uppercase">
                        {detail.label}
                      </dt>
                      <dd className="text-sm font-medium">
                        {detail.href ? (
                          <a
                            href={detail.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2"
                          >
                            {detail.value}
                          </a>
                        ) : (
                          detail.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {post.externalUrl && (
                <a
                  href={post.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Acessar o link
                  <ArrowSquareOutIcon aria-hidden className="size-4" />
                  <span className="sr-only">(abre em outra aba)</span>
                </a>
              )}
            </div>
          )}

          <PostMarkdown>{post.bodyMd}</PostMarkdown>

          {post.imageFileIds.length > 0 && (
            <section aria-label="Galeria" className="grid gap-3 sm:grid-cols-2">
              {post.imageFileIds.map((id) => (
                <a
                  key={id}
                  href={fileUrl(id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="overflow-hidden rounded-xl border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <img
                    src={fileUrl(id)}
                    alt="Imagem da galeria (abre em outra aba)"
                    width={600}
                    height={400}
                    loading="lazy"
                    className="aspect-[3/2] w-full bg-muted object-cover"
                  />
                </a>
              ))}
            </section>
          )}
        </article>
      </div>
    </main>
  )
}
