'use client'

import type { MessageView } from '@ufc-flow/contracts'
import {
  ChatCircleIcon,
  DotsThreeIcon,
  HeartIcon,
  ShieldIcon,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { REPORT_REASONS } from '@/data/report-reasons'
import { useSession } from '@/lib/auth/use-session'
import {
  deleteMessageAction,
  editMessageAction,
  likeAction,
} from '@/lib/forum/forum-actions'
import { useInvalidateForum, useUpdateMessage } from '@/lib/forum/use-forum'
import { timeAgo } from '@/lib/notifications/describe'
import { cn } from '@/lib/utils'

import { AuthorAvatar } from './author-avatar'
import { Composer } from './composer'
import { MessageContent } from './message-content'
import { ReportDialog } from './report-dialog'

export type ForumContext = {
  courseSlug: string
  curriculumSlug: string | null
  curriculumLabel: string | null
  canPost: boolean
}

export const conversationHref = (courseSlug: string, id: string) =>
  `/${courseSlug}/forum/${id}`

// Aviso no lugar da mensagem fora do ar (mockup Forum)
function Placeholder({ message }: { message: MessageView }) {
  const replies =
    message.replyCount > 0
      ? `${message.replyCount === 1 ? 'a resposta continua visível' : `as ${message.replyCount} respostas continuam visíveis`}`
      : null
  const [title, detail] =
    message.status === 'HIDDEN'
      ? ['Mensagem oculta pela moderação', 'Aguardando a decisão da moderação']
      : message.removedBy === 'AUTHOR'
        ? ['Mensagem apagada pelo autor', null]
        : [
            'Mensagem removida pela moderação',
            message.removalCategory
              ? `Motivo: ${REPORT_REASONS[message.removalCategory].toLowerCase()}`
              : null,
          ]
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <ShieldIcon className="size-5" />
      </span>
      <span className="flex flex-col pt-0.5">
        <span className="text-sm text-muted-foreground">{title}</span>
        {(detail || replies) && (
          <span className="text-xs text-muted-foreground">
            {[detail, replies].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
    </div>
  )
}

export function MessageItem({
  message,
  context,
  now,
  variant = 'feed',
  onReply,
}: {
  message: MessageView
  context: ForumContext
  now: Date
  // feed: na timeline, abre a conversa; focus: a mensagem da conversa
  variant?: 'feed' | 'focus' | 'reply'
  onReply?: () => void
}) {
  const { data: user } = useSession()
  const updateMessage = useUpdateMessage()
  const invalidate = useInvalidateForum()
  const [editing, setEditing] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isLiking, startLiking] = useTransition()
  const [isDeleting, startDeleting] = useTransition()

  const own = user?.id === message.author?.id
  const subjectHref = (code: string) =>
    context.curriculumSlug
      ? `/${context.courseSlug}/${context.curriculumSlug}/${code}`
      : null
  const href = conversationHref(context.courseSlug, message.id)

  if (message.content === null) {
    return (
      <article className="py-4">
        <Placeholder message={message} />
        {variant === 'feed' && message.replyCount > 0 && (
          <Link
            href={href}
            className="mt-2 ml-13 inline-block text-xs font-medium underline underline-offset-2"
          >
            Ver a conversa
          </Link>
        )}
      </article>
    )
  }

  const toggleLike = () =>
    startLiking(async () => {
      const liked = !message.likedByMe
      // Mostra já; a resposta da API corrige o número
      updateMessage(message.id, (current) => ({
        ...current,
        likedByMe: liked,
        likeCount: current.likeCount + (liked ? 1 : -1),
      }))
      const result = await likeAction(message.id, liked)
      if (result.ok) {
        updateMessage(message.id, (current) => ({ ...current, ...result.data }))
      } else {
        updateMessage(message.id, (current) => ({
          ...current,
          likedByMe: !liked,
          likeCount: current.likeCount + (liked ? -1 : 1),
        }))
        toast.error(result.problem.detail ?? 'Não foi possível curtir')
      }
    })

  const remove = () =>
    startDeleting(async () => {
      const result = await deleteMessageAction(message.id)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível apagar')
        return
      }
      setDeleting(false)
      toast.success('Mensagem apagada')
      await invalidate()
    })

  const name = message.author?.name ?? 'Conta excluída'
  const focus = variant === 'focus'

  return (
    <article className={cn('relative flex gap-3', focus ? 'py-2' : 'py-4')}>
      {!focus && (
        <AuthorAvatar
          name={message.author?.name ?? null}
          avatarFileId={message.author?.avatarFileId}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header
          className={cn(
            'flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm',
            focus && 'gap-3',
          )}
        >
          {focus && (
            <AuthorAvatar
              name={message.author?.name ?? null}
              avatarFileId={message.author?.avatarFileId}
            />
          )}
          <span
            className={cn(
              'flex flex-wrap items-baseline gap-x-1.5',
              focus && 'flex-col',
            )}
          >
            <span className="font-semibold">{name}</span>
            <span className="text-xs text-muted-foreground">
              {focus
                ? new Date(message.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : `· ${timeAgo(message.createdAt, now).replace(/^há /, '')}`}
              {message.editedAt ? ' · editada' : ''}
            </span>
          </span>
          {message.status === 'HIDDEN' && (
            <span className="rounded-full bg-amber-50 px-2 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Oculta
            </span>
          )}
        </header>
        {message.replyingTo && variant === 'reply' && (
          <span className="text-xs text-muted-foreground">
            respondendo a {message.replyingTo.authorName}
          </span>
        )}

        {editing ? (
          <Composer
            courseSlug={context.courseSlug}
            curriculumLabel={context.curriculumLabel}
            placeholder="Editar mensagem"
            submitLabel="Salvar"
            initial={message.content}
            onCancel={() => setEditing(false)}
            onSubmit={async (content) => {
              const result = await editMessageAction(message.id, { content })
              if (!result.ok) {
                toast.error(result.problem.detail ?? 'Não foi possível salvar')
                return false
              }
              updateMessage(message.id, () => result.data)
              setEditing(false)
              return true
            }}
          />
        ) : (
          <MessageContent
            content={message.content}
            mentions={message.mentions}
            subjectHref={subjectHref}
            className={cn(
              'leading-relaxed wrap-break-word whitespace-pre-wrap',
              focus ? 'text-lg' : 'text-[15px]',
            )}
          />
        )}

        {focus && (
          <p className="flex gap-4 border-b pb-3 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{message.replyCount}</strong>{' '}
              {message.replyCount === 1 ? 'resposta' : 'respostas'}
            </span>
            <span>
              <strong className="text-foreground">{message.likeCount}</strong>{' '}
              {message.likeCount === 1 ? 'curtida' : 'curtidas'}
            </span>
          </p>
        )}

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {variant === 'feed' ? (
            <Link
              href={href}
              aria-label={`Abrir a conversa (${message.replyCount} respostas)`}
              className="flex h-10 items-center gap-1.5 rounded-full px-2 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChatCircleIcon aria-hidden className="size-5" />
              {message.replyCount > 0 ? message.replyCount : 'Responder'}
            </Link>
          ) : (
            context.canPost &&
            message.status === 'VISIBLE' && (
              <button
                type="button"
                onClick={onReply}
                className="flex h-10 items-center gap-1.5 rounded-full px-2 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChatCircleIcon aria-hidden className="size-5" />
                Responder
              </button>
            )
          )}
          {variant === 'reply' && message.replyCount > 0 && (
            <Link
              href={href}
              className="flex h-10 items-center rounded-full px-2 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {message.replyCount === 1
                ? '1 resposta'
                : `${message.replyCount} respostas`}
            </Link>
          )}
          <button
            type="button"
            aria-pressed={message.likedByMe}
            aria-label={message.likedByMe ? 'Descurtir' : 'Curtir'}
            disabled={
              !context.canPost || message.status !== 'VISIBLE' || isLiking
            }
            onClick={toggleLike}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-full px-2 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:hover:bg-transparent',
              message.likedByMe && 'text-orange-600 dark:text-orange-400',
            )}
          >
            <HeartIcon
              aria-hidden
              weight={message.likedByMe ? 'fill' : 'bold'}
              className="size-5"
            />
            {message.likeCount > 0 && message.likeCount}
          </button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Mais ações"
                  className="ml-auto flex size-10 items-center justify-center rounded-full hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <DotsThreeIcon className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {message.editableUntil && (
                  <DropdownMenuItem onSelect={() => setEditing(true)}>
                    Editar
                  </DropdownMenuItem>
                )}
                {own ? (
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => setDeleting(true)}
                  >
                    Apagar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setReporting(true)}>
                    Denunciar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <ReportDialog
        messageId={message.id}
        open={reporting}
        onOpenChange={setReporting}
      />
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apagar a mensagem?</DialogTitle>
            <DialogDescription>
              {message.replyCount > 0
                ? 'Ela tem respostas: o texto sai e fica “mensagem apagada”, para a conversa continuar.'
                : 'Ela sai do fórum.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={remove}
            >
              {isDeleting ? 'Apagando…' : 'Apagar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  )
}
