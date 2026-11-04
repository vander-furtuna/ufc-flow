'use client'

import type { ModeratorRequest, RestrictionView } from '@ufc-flow/contracts'
import { useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import { AuthorAvatar } from '@/components/forum/author-avatar'
import { useNow } from '@/components/notifications/notification-item'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  reviewRequestAction,
  liftRestrictionAction,
} from '@/lib/moderation/moderation-actions'
import { useRefreshModeration } from '@/lib/moderation/use-moderation'
import { timeAgo } from '@/lib/notifications/describe'

import { ModerationDialog } from './moderation-dialog'

const card = 'flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-5'

const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })

export function RequestCard({ request }: { request: ModeratorRequest }) {
  const now = useNow()
  const refresh = useRefreshModeration()
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')
  const [isSending, startSending] = useTransition()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!decision) return
    startSending(async () => {
      const result = await reviewRequestAction(request.id, decision, note)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível responder')
        return
      }
      toast.success(
        decision === 'approve' ? 'Pedido aprovado' : 'Pedido rejeitado',
      )
      setDecision(null)
      setNote('')
      await refresh()
    })
  }

  return (
    <article className={card}>
      <div className="flex items-start gap-3">
        <AuthorAvatar name={request.user.name} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-sm">
            <strong>{request.user.name}</strong>{' '}
            <span className="text-muted-foreground">quer moderar </span>
            <strong>{request.course.name}</strong>
          </p>
          <span className="truncate text-xs text-muted-foreground">
            {request.user.email} · {timeAgo(request.createdAt, now)}
          </span>
        </div>
      </div>
      <blockquote className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed">
        {request.justification}
      </blockquote>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDecision('approve')}>Aprovar</Button>
        <Button variant="outline" onClick={() => setDecision('reject')}>
          Rejeitar
        </Button>
      </div>
      <Dialog
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision === 'approve'
                ? 'Aprovar o pedido'
                : 'Rejeitar o pedido'}
            </DialogTitle>
            <DialogDescription>
              {request.user.name} recebe uma notificação com a decisão
              {decision === 'reject' ? ' e a nota' : ''}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor={`note-${request.id}`}
                className="text-sm font-medium"
              >
                Nota (opcional)
              </label>
              <textarea
                id={`note-${request.id}`}
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDecision(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={decision === 'reject' ? 'destructive' : 'default'}
                isLoading={isSending}
              >
                {decision === 'approve' ? 'Aprovar' : 'Rejeitar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  )
}

export function RestrictionCard({
  restriction,
}: {
  restriction: RestrictionView
}) {
  const now = useNow()
  const refresh = useRefreshModeration()
  const [lifting, setLifting] = useState(false)
  const banned = restriction.type === 'BAN'

  return (
    <article className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <AuthorAvatar name={restriction.user.name} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-sm">
            <strong>{restriction.user.name}</strong>{' '}
            <span className="text-muted-foreground">
              {banned ? 'banido de' : 'silenciado em'}{' '}
            </span>
            <strong>{restriction.course.name}</strong>
          </p>
          <span className="text-xs text-muted-foreground">
            {restriction.expiresAt
              ? `até ${dayMonth(restriction.expiresAt)}`
              : 'sem prazo'}{' '}
            · {timeAgo(restriction.createdAt, now)}
            {restriction.createdBy
              ? ` · por ${restriction.createdBy.name}`
              : ''}
          </span>
        </div>
        <span
          className={
            banned
              ? 'inline-flex h-6 items-center rounded-full bg-red-50 px-2.5 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300'
              : 'inline-flex h-6 items-center rounded-full bg-amber-100 px-2.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
          }
        >
          {banned ? 'Banido' : 'Silenciado'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Motivo: {restriction.reason}
      </p>
      <div>
        <Button variant="outline" onClick={() => setLifting(true)}>
          Suspender restrição
        </Button>
      </div>
      <ModerationDialog
        open={lifting}
        onOpenChange={setLifting}
        title="Suspender restrição"
        description={`${restriction.user.name} volta a ${banned ? 'acessar' : 'escrever no'} o fórum de ${restriction.course.name}.`}
        confirmLabel="Suspender"
        onConfirm={async ({ reason }) => {
          const result = await liftRestrictionAction(restriction.id, reason)
          if (!result.ok) {
            toast.error(result.problem.detail ?? 'Não foi possível suspender')
            return false
          }
          toast.success('Restrição suspensa')
          await refresh()
          return true
        }}
      />
    </article>
  )
}
