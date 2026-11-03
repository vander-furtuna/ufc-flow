'use client'

import { CaretLeftIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import type { CourseHeadingData } from '@/components/course-heading'
import { Composer } from '@/components/forum/composer'
import { MessageItem, type ForumContext } from '@/components/forum/message-item'
import { Header } from '@/components/header'
import { useNow } from '@/components/notifications/notification-item'
import { Button } from '@/components/ui/button'
import { replyAction } from '@/lib/forum/forum-actions'
import {
  FORUM_KEY,
  errorCode,
  useCanPost,
  useConversation,
  useMoreReplies,
  useMyRestriction,
} from '@/lib/forum/use-forum'

import { restrictionText } from '../forum-page'

// Conversa (mockup Forum-Mobile): a cadeia até a raiz, a mensagem em
// destaque e as respostas diretas, com o editor para responder
export function ConversationPage({
  course,
  messageId,
}: {
  course: CourseHeadingData
  messageId: string
}) {
  const now = useNow()
  const conversation = useConversation(messageId)
  const more = useMoreReplies(
    messageId,
    conversation.data?.replies.nextCursor ?? null,
  )
  const canPost = useCanPost(course.slug)
  const { data: restriction } = useMyRestriction(course.slug)
  const queryClient = useQueryClient()
  const composerRef = useRef<HTMLDivElement>(null)
  const [target, setTarget] = useState<{ id: string; name: string } | null>(
    null,
  )

  const writes = canPost && restriction?.type !== 'MUTE'
  const context: ForumContext = {
    courseSlug: course.slug,
    curriculumSlug: course.curriculum?.slug ?? null,
    curriculumLabel: course.curriculum
      ? `EC ${course.curriculum.period}`
      : null,
    canPost: writes,
  }
  const forumHref = `/${course.slug}/forum`

  if (conversation.isPending) {
    return (
      <Shell forumHref={forumHref} courseName={course.name}>
        <div
          aria-hidden
          className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
        />
      </Shell>
    )
  }
  if (conversation.isError) {
    const code = errorCode(conversation.error)
    return (
      <Shell forumHref={forumHref} courseName={course.name}>
        <p role="alert" className="rounded-2xl border p-6 text-sm">
          {code === 'FORUM_MESSAGE_NOT_FOUND'
            ? 'Esta mensagem não existe mais ou não está disponível.'
            : conversation.error.message}
        </p>
      </Shell>
    )
  }

  const { ancestors, message, replies } = conversation.data
  const extra = more.data?.pages.flatMap((page) => page.items) ?? []
  const allReplies = [...replies.items, ...extra]
  const hasMore = more.data ? more.hasNextPage : replies.nextCursor !== null
  const replyTo = target ?? {
    id: message.id,
    name: message.author?.name ?? 'a mensagem',
  }

  const focusComposer = (id: string, name: string) => {
    setTarget({ id, name })
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      })
      composerRef.current?.querySelector('textarea')?.focus()
    })
  }

  const reply = async (content: string) => {
    const result = await replyAction(replyTo.id, { content })
    if (!result.ok) {
      toast.error(result.problem.detail ?? 'Não foi possível responder')
      return false
    }
    setTarget(null)
    await queryClient.invalidateQueries({ queryKey: FORUM_KEY })
    return true
  }

  return (
    <Shell forumHref={forumHref} courseName={course.name}>
      {ancestors.length > 0 && (
        <ol
          aria-label="Mensagens anteriores da conversa"
          className="flex flex-col"
        >
          {ancestors.map((item) => (
            <li key={item.id} className="relative border-l-2 border-muted pl-4">
              <MessageItem message={item} context={context} now={now} />
            </li>
          ))}
        </ol>
      )}

      <section aria-label="Mensagem" className="rounded-2xl border p-4 sm:p-5">
        <MessageItem
          message={message}
          context={context}
          now={now}
          variant="focus"
          onReply={() =>
            focusComposer(message.id, message.author?.name ?? 'a mensagem')
          }
        />
      </section>

      {restriction && (
        <output className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
          {restrictionText(restriction.type, restriction.expiresAt)}
        </output>
      )}

      {writes && message.status === 'VISIBLE' && (
        <div ref={composerRef} className="rounded-2xl border p-4">
          <Composer
            key={replyTo.id}
            courseSlug={course.slug}
            curriculumLabel={context.curriculumLabel}
            placeholder={`Responder a ${replyTo.name}… use @ para citar`}
            submitLabel="Responder"
            onSubmit={reply}
            onCancel={target ? () => setTarget(null) : undefined}
          />
        </div>
      )}

      <section aria-label="Respostas" className="flex flex-col">
        {allReplies.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma resposta ainda.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {allReplies.map((item) => (
              <li key={item.id}>
                <MessageItem
                  message={item}
                  context={context}
                  now={now}
                  variant="reply"
                  onReply={() =>
                    focusComposer(item.id, item.author?.name ?? 'a mensagem')
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <Button
            variant="ghost"
            className="self-center"
            isLoading={more.isFetching}
            onClick={() => (more.data ? more.fetchNextPage() : more.refetch())}
          >
            Carregar mais respostas
          </Button>
        )}
      </section>
    </Shell>
  )
}

function Shell({
  forumHref,
  courseName,
  children,
}: {
  forumHref: string
  courseName: string
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <Header />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <div className="flex items-center gap-3">
            <Link
              href={forumHref}
              aria-label="Voltar ao fórum"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <CaretLeftIcon className="size-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="font-clash text-2xl font-semibold">Conversa</h1>
              <span className="text-xs text-muted-foreground">
                Fórum · {courseName}
              </span>
            </div>
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
