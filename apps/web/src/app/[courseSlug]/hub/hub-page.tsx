'use client'

import type { PostStatus, PostType } from '@ufc-flow/contracts'
import { PlusIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { useState } from 'react'

import { AppSearchBar } from '@/components/app-search-bar'
import {
  CourseHeading,
  type CourseHeadingData,
} from '@/components/course-heading'
import { Header } from '@/components/header'
import { ImportantLinks, NextDeadlines } from '@/components/hub/hub-aside'
import { PinnedPost, PostCard } from '@/components/hub/post-card'
import { Button } from '@/components/ui/button'
import { nativeSelect } from '@/components/academic/native-select'
import {
  POST_STATUS_LABELS,
  POST_TYPE_ORDER,
  POST_TYPES,
} from '@/data/post-types'
import { useDebounce } from '@/hooks/use-debounce'
import { useCanManageHub, useHubFeed, useMarkHubRead } from '@/lib/hub/use-hub'
import { cn } from '@/lib/utils'

export type HubCourse = CourseHeadingData

const STATUSES: PostStatus[] = ['PUBLISHED', 'DRAFT', 'ARCHIVED']

// Hub do curso (mockups Hub e Mobile-Hub). Público: o anônimo lê o feed; a
// moderação vê também rascunhos e arquivados e escreve.
export function HubPage({ course }: { course: HubCourse }) {
  const [type, setType] = useState<PostType | null>(null)
  const [status, setStatus] = useState<PostStatus>('PUBLISHED')
  const [search, setSearch] = useState('')
  const [now] = useState(() => new Date())
  const debounced = useDebounce(search.trim(), 300)
  // A API pede ao menos 2 letras
  const q = debounced.length >= 2 ? debounced : undefined

  const canManage = useCanManageHub(course.slug)
  useMarkHubRead(course.slug)
  const feed = useHubFeed(course.slug, {
    type: type ?? undefined,
    q,
    status: canManage ? status : 'PUBLISHED',
  })

  const pinned = feed.data?.pages[0]?.pinned ?? []
  const items = feed.data?.pages.flatMap((page) => page.items) ?? []
  const isEmpty = feed.isSuccess && pinned.length === 0 && items.length === 0
  const gradeHref = course.curriculum
    ? `/${course.slug}/${course.curriculum.slug}`
    : undefined
  const newPostHref = `/${course.slug}/hub/novo`

  const filters: { id: PostType | null; label: string }[] = [
    { id: null, label: 'Tudo' },
    ...POST_TYPE_ORDER.map((id) => ({ id, label: POST_TYPES[id].filter })),
  ]

  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-4 pt-8 pb-32 sm:px-6 sm:pt-12">
      <div className="flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
        <Header />

        <CourseHeading course={course} current="hub" />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
          <section aria-label="Posts" className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <fieldset className="-mx-4 flex min-w-0 [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
                <legend className="sr-only">Filtrar por tipo</legend>
                {filters.map((filter) => {
                  const on = filter.id === type
                  return (
                    <button
                      key={filter.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setType(filter.id)}
                      className={cn(
                        'h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted',
                      )}
                    >
                      {filter.label}
                    </button>
                  )
                })}
              </fieldset>
              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-indigo-50 px-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <ShieldCheckIcon aria-hidden className="size-3.5" />
                    Moderação
                  </span>
                  <label className="sr-only" htmlFor="hub-status">
                    Situação dos posts
                  </label>
                  <select
                    id="hub-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as PostStatus)
                    }
                    className={cn(nativeSelect, 'h-10 w-auto')}
                  >
                    {STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {POST_STATUS_LABELS[value]}s
                      </option>
                    ))}
                  </select>
                  <Button asChild className="hidden h-10 sm:inline-flex">
                    <Link href={newPostHref}>
                      <PlusIcon aria-hidden className="size-4" />
                      Novo post
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {feed.isPending ? (
              <div aria-hidden className="grid gap-4 md:grid-cols-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="h-44 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
                  />
                ))}
              </div>
            ) : feed.isError ? (
              <p role="alert" className="rounded-2xl border p-6 text-sm">
                Não foi possível carregar o hub agora. Tente de novo em
                instantes.
              </p>
            ) : isEmpty ? (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {q
                  ? `Nada encontrado para “${q}”.`
                  : 'Nada publicado neste tipo por enquanto.'}
              </p>
            ) : (
              <>
                {pinned.map((post) => (
                  <PinnedPost
                    key={post.id}
                    post={post}
                    courseSlug={course.slug}
                    now={now}
                  />
                ))}
                <div className="grid gap-4 md:grid-cols-2">
                  {items.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      courseSlug={course.slug}
                      now={now}
                    />
                  ))}
                </div>
                {feed.hasNextPage && (
                  <Button
                    variant="outline"
                    className="self-center"
                    isLoading={feed.isFetchingNextPage}
                    onClick={() => feed.fetchNextPage()}
                  >
                    Carregar mais
                  </Button>
                )}
              </>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <ImportantLinks courseSlug={course.slug} />
            <NextDeadlines courseSlug={course.slug} now={now} />
          </aside>
        </div>
      </div>

      <div className="fixed bottom-6 left-0 z-50 flex w-full justify-center px-4">
        <div className="flex w-full items-end gap-1 sm:w-md">
          <AppSearchBar
            placeholder="Pesquisar no hub"
            value={search}
            onChange={setSearch}
            onClear={search ? () => setSearch('') : undefined}
            baseHref={gradeHref}
            currentNavId="hub"
          />
          {canManage && (
            <Link
              href={newPostHref}
              aria-label="Novo post"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:hidden"
            >
              <PlusIcon className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
