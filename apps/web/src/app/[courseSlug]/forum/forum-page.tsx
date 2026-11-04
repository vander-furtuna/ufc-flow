'use client'

import { ArrowUpIcon, PencilSimpleIcon, XIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  CourseHeading,
  type CourseHeadingData,
} from '@/components/course-heading'
import { AuthorAvatar } from '@/components/forum/author-avatar'
import { Composer } from '@/components/forum/composer'
import { ForumRules, TrendingSubjects } from '@/components/forum/forum-aside'
import { MessageItem, type ForumContext } from '@/components/forum/message-item'
import { Header } from '@/components/header'
import { useCanModerate } from '@/lib/moderation/use-moderation'
import { NavMenu } from '@/components/nav-menu'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useSession } from '@/lib/auth/use-session'
import { postMessageAction } from '@/lib/forum/forum-actions'
import {
  FORUM_KEY,
  useCanPost,
  useMyRestriction,
  useNewMessages,
  errorCode,
  useTimeline,
} from '@/lib/forum/use-forum'
import { useNow } from '@/components/notifications/notification-item'

export type ForumCourse = CourseHeadingData

export function restrictionText(
  type: 'MUTE' | 'BAN',
  expiresAt: string | null,
) {
  const until = expiresAt
    ? ` até ${new Date(expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
    : ''
  return type === 'MUTE'
    ? `A moderação silenciou você neste fórum${until}: você lê, mas não escreve nem curte.`
    : `A moderação tirou seu acesso a este fórum${until}.`
}

// Fórum do curso (mockups Forum e Mobile-Forum): timeline de mensagens raiz,
// "N novas mensagens" a cada 60 s, editor com @ e o que a moderação decidiu
export function ForumPage({ course }: { course: ForumCourse }) {
  const now = useNow()
  const { data: user } = useSession()
  const canPost = useCanPost(course.slug)
  const canModerate = useCanModerate(course.slug)
  const { data: restriction } = useMyRestriction(course.slug)
  const timeline = useTimeline(course.slug)
  const queryClient = useQueryClient()
  const [writing, setWriting] = useState(false)

  const items = timeline.data?.pages.flatMap((page) => page.items) ?? []
  const { data: fresh = 0 } = useNewMessages(
    course.slug,
    items[0]?.createdAt ?? null,
  )
  const muted = restriction?.type === 'MUTE'
  const banned =
    restriction?.type === 'BAN' || errorCode(timeline.error) === 'FORUM_BANNED'
  const writes = canPost && !muted
  const context: ForumContext = {
    courseSlug: course.slug,
    curriculumSlug: course.curriculum?.slug ?? null,
    curriculumLabel: course.curriculum
      ? `EC ${course.curriculum.period}`
      : null,
    canPost: writes,
    canModerate,
  }
  const gradeHref = course.curriculum
    ? `/${course.slug}/${course.curriculum.slug}`
    : undefined

  const publish = async (content: string) => {
    const result = await postMessageAction(course.slug, { content })
    if (!result.ok) {
      toast.error(result.problem.detail ?? 'Não foi possível publicar')
      return false
    }
    setWriting(false)
    await queryClient.invalidateQueries({
      queryKey: [...FORUM_KEY, course.slug],
    })
    return true
  }

  const showNew = async () => {
    await queryClient.resetQueries({
      queryKey: [...FORUM_KEY, course.slug, 'timeline'],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const composer = (focusOnOpen: boolean) => (
    <Composer
      courseSlug={course.slug}
      curriculumLabel={context.curriculumLabel}
      placeholder="Escreva para o curso… use @ para citar uma disciplina"
      submitLabel="Publicar"
      focusOnOpen={focusOnOpen}
      onSubmit={publish}
    />
  )

  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-4 pt-8 pb-32 sm:px-6 sm:pt-12">
      <div className="flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
        <Header />
        <CourseHeading course={course} current="forum" />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section
            aria-label="Mensagens"
            className="flex min-w-0 flex-col gap-4"
          >
            {restriction && (
              <output className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                {restrictionText(restriction.type, restriction.expiresAt)}
              </output>
            )}

            {writes ? (
              <div className="hidden gap-3 rounded-2xl border p-4 sm:flex">
                <AuthorAvatar
                  name={user?.name ?? null}
                  avatarFileId={user?.avatarFileId}
                />
                <div className="min-w-0 flex-1">{composer(false)}</div>
              </div>
            ) : (
              !restriction &&
              user && (
                <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  Para escrever, cadastre sua matrícula neste curso em{' '}
                  <Link
                    href="/minha-area"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Minha área
                  </Link>
                  .
                </p>
              )
            )}

            {fresh > 0 && (
              <button
                type="button"
                onClick={showNew}
                className="sticky top-4 z-20 mx-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-4 text-sm font-semibold text-orange-800 shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200"
              >
                <ArrowUpIcon aria-hidden className="size-4" />
                {fresh === 1 ? '1 nova mensagem' : `${fresh} novas mensagens`}
              </button>
            )}

            {banned ? null : timeline.isPending ? (
              <div aria-hidden className="flex flex-col gap-4">
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
                  />
                ))}
              </div>
            ) : timeline.isError ? (
              <p role="alert" className="rounded-2xl border p-6 text-sm">
                {timeline.error.message}
              </p>
            ) : items.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Ninguém escreveu ainda. Que tal começar a conversa?
              </p>
            ) : (
              <>
                <ul className="flex flex-col divide-y">
                  {items.map((message) => (
                    <li key={message.id}>
                      <MessageItem
                        message={message}
                        context={context}
                        now={now}
                      />
                    </li>
                  ))}
                </ul>
                {timeline.hasNextPage && (
                  <Button
                    variant="ghost"
                    className="self-center"
                    isLoading={timeline.isFetchingNextPage}
                    onClick={() => timeline.fetchNextPage()}
                  >
                    Carregar mensagens anteriores
                  </Button>
                )}
              </>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <TrendingSubjects
              courseSlug={course.slug}
              curriculumSlug={course.curriculum?.slug ?? null}
            />
            <ForumRules />
          </aside>
        </div>
      </div>

      <div className="fixed bottom-6 left-0 z-50 flex w-full justify-center px-4">
        <div className="flex w-full gap-1 sm:w-md">
          <NavMenu currentNavId="forum" baseHref={gradeHref} />
          {writes && (
            <button
              type="button"
              onClick={() => setWriting(true)}
              className="flex h-12 flex-1 items-center gap-2 rounded-full border bg-accent/70 px-4 text-sm text-muted-foreground shadow-lg backdrop-blur-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:hidden"
            >
              <PencilSimpleIcon aria-hidden className="size-5" />
              Escreva para o curso…
            </button>
          )}
        </div>
      </div>

      {/* Escrever em tela cheia no celular (mockup Mobile-Forum-Escrever) */}
      <Dialog open={writing} onOpenChange={setWriting}>
        <DialogContent className="flex h-dvh max-h-none w-full max-w-none flex-col gap-4 rounded-none border-0 bg-background p-4 sm:h-auto sm:max-h-[calc(100%-2rem)] sm:max-w-lg sm:rounded-2xl sm:border [&>button:last-child]:hidden">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setWriting(false)}
              aria-label="Cancelar"
              className="flex size-10 items-center justify-center rounded-full hover:bg-muted"
            >
              <XIcon className="size-5" />
            </button>
            <DialogTitle className="font-clash text-lg">
              Nova mensagem
            </DialogTitle>
            <span className="size-10" />
          </div>
          <p className="text-xs text-muted-foreground">
            Para todos de {course.name}
          </p>
          {composer(true)}
        </DialogContent>
      </Dialog>
    </main>
  )
}
