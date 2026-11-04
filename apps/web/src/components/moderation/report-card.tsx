'use client'

import type {
  MessageModerationInput,
  ReportQueueItem,
  ReportReason,
} from '@ufc-flow/contracts'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { AuthorAvatar } from '@/components/forum/author-avatar'
import { useNow } from '@/components/notifications/notification-item'
import { Button } from '@/components/ui/button'
import { REPORT_REASONS } from '@/data/report-reasons'
import {
  dismissReportsAction,
  moderateMessageAction,
  restrictUserAction,
} from '@/lib/moderation/moderation-actions'
import { useRefreshModeration } from '@/lib/moderation/use-moderation'
import { timeAgo } from '@/lib/notifications/describe'
import { cn } from '@/lib/utils'

import { ModerationDialog, type ModerationChoice } from './moderation-dialog'

type Action = 'REMOVE' | 'HIDE' | 'RESTORE' | 'DISMISS'

const STATUS = {
  VISIBLE: [
    'Visível',
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  ],
  HIDDEN: [
    'Oculta',
    'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  ],
  REMOVED: [
    'Removida',
    'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  ],
} as const

const DIALOGS: Record<
  Action,
  { title: string; description: string; confirm: string }
> = {
  REMOVE: {
    title: 'Remover mensagem',
    description:
      'Os leitores veem só a categoria. O texto fica guardado e pode ser restaurado.',
    confirm: 'Remover',
  },
  HIDE: {
    title: 'Ocultar mensagem',
    description: 'Sai do ar para os leitores; o autor continua vendo.',
    confirm: 'Ocultar',
  },
  RESTORE: {
    title: 'Restaurar mensagem',
    description: 'A mensagem volta ao ar e as denúncias são descartadas.',
    confirm: 'Restaurar',
  },
  DISMISS: {
    title: 'Descartar denúncias',
    description:
      'As denúncias são encerradas; uma mensagem oculta volta ao ar.',
    confirm: 'Descartar',
  },
}

// O motivo mais denunciado sugere a categoria da remoção
const topReason = (item: ReportQueueItem): ReportReason =>
  [...item.reasons].sort((a, b) => b.count - a.count)[0]?.reason ?? 'OTHER'

// Aplica a ação na mensagem e, se pedido, silencia o autor
export async function applyModeration(
  messageId: string,
  action: Action,
  choice: ModerationChoice,
  author: { id: string; courseSlug: string } | null,
): Promise<boolean> {
  const result =
    action === 'DISMISS'
      ? await dismissReportsAction(messageId, choice.reason)
      : await moderateMessageAction(messageId, {
          action,
          reason: choice.reason,
          ...(action === 'REMOVE'
            ? { category: choice.category ?? 'OTHER' }
            : {}),
        } as MessageModerationInput)
  if (!result.ok) {
    toast.error(result.problem.detail ?? 'Não foi possível moderar')
    return false
  }
  if (choice.restriction && author) {
    const restricted = await restrictUserAction({
      userId: author.id,
      courseSlug: author.courseSlug,
      type: choice.restriction.type,
      reason: choice.reason,
      days: choice.restriction.days,
    })
    if (!restricted.ok) {
      toast.error(restricted.problem.detail ?? 'Não foi possível silenciar')
      return true
    }
  }
  toast.success('Feito')
  return true
}

// Um item da fila (mockups Admin-Moderacao e Mobile-Admin-Moderacao)
export function ReportCard({ item }: { item: ReportQueueItem }) {
  const now = useNow()
  const refresh = useRefreshModeration()
  const [action, setAction] = useState<Action | null>(null)
  const [label, badge] = STATUS[item.status]
  const author = item.author
    ? { id: item.author.id, courseSlug: item.course.slug }
    : null

  return (
    <article className="overflow-hidden rounded-2xl border bg-background">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-4 py-3 sm:px-5">
        <span
          className={cn(
            'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold',
            item.autoHidden ? STATUS.HIDDEN[1] : badge,
          )}
        >
          {item.autoHidden ? 'Oculta automaticamente' : label}
        </span>
        <span className="text-xs text-muted-foreground">
          {item.course.name} · {item.reportCount}{' '}
          {item.reportCount === 1 ? 'denúncia' : 'denúncias'}
          {item.reportCount > 1 ? ' de pessoas diferentes' : ''} ·{' '}
          {timeAgo(item.firstReportedAt, now)}
        </span>
        <Link
          href={`/${item.course.slug}/forum/${item.rootId}`}
          target="_blank"
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
        >
          Ver no fórum
          <ArrowSquareOutIcon aria-hidden className="size-3.5" />
          <span className="sr-only">(abre em outra aba)</span>
        </Link>
      </header>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex gap-3">
          <AuthorAvatar name={item.author?.name ?? null} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm">
              <strong>{item.author?.name ?? 'Conta excluída'}</strong>{' '}
              <span className="text-muted-foreground">
                · conteúdo no momento da denúncia
              </span>
            </p>
            <blockquote className="rounded-xl bg-muted px-4 py-3 text-[15px] leading-relaxed wrap-break-word whitespace-pre-wrap">
              {item.snapshot}
            </blockquote>
          </div>
        </div>
        <ul aria-label="Motivos" className="flex flex-wrap gap-2">
          {item.reasons.map((reason) => (
            <li
              key={reason.reason}
              className="inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium"
            >
              {REPORT_REASONS[reason.reason]} · {reason.count}
            </li>
          ))}
        </ul>
        {item.details.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {item.details.map((detail) => (
              <li key={detail}>“{detail}”</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {item.status !== 'REMOVED' && (
            <Button variant="destructive" onClick={() => setAction('REMOVE')}>
              Remover mensagem
            </Button>
          )}
          {item.status === 'VISIBLE' ? (
            <Button variant="outline" onClick={() => setAction('HIDE')}>
              Ocultar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setAction('RESTORE')}>
              Restaurar
            </Button>
          )}
          <Button variant="outline" onClick={() => setAction('DISMISS')}>
            Descartar {item.reportCount === 1 ? 'denúncia' : 'denúncias'}
          </Button>
        </div>
      </div>
      {action && (
        <ModerationDialog
          open
          onOpenChange={(open) => !open && setAction(null)}
          title={DIALOGS[action].title}
          description={DIALOGS[action].description}
          confirmLabel={DIALOGS[action].confirm}
          destructive={action === 'REMOVE'}
          category={action === 'REMOVE' ? topReason(item) : undefined}
          restriction={
            author && (action === 'REMOVE' || action === 'HIDE')
              ? 'optional'
              : undefined
          }
          onConfirm={async (choice) => {
            const done = await applyModeration(
              item.messageId,
              action,
              choice,
              author,
            )
            if (done) await refresh()
            return done
          }}
        />
      )}
    </article>
  )
}
