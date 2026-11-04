'use client'

import type { MessageView } from '@ufc-flow/contracts'
import { toast } from 'sonner'

import { restrictUserAction } from '@/lib/moderation/moderation-actions'
import { useRefreshModeration } from '@/lib/moderation/use-moderation'

import { ModerationDialog } from './moderation-dialog'
import { applyModeration } from './report-card'

export type MessageModerationAction = 'HIDE' | 'REMOVE' | 'RESTORE' | 'RESTRICT'

// O que a moderação pode fazer com a mensagem, conforme a situação dela
export function moderationActionsFor(
  message: MessageView,
): MessageModerationAction[] {
  const actions: MessageModerationAction[] = []
  if (message.status === 'VISIBLE') actions.push('HIDE', 'REMOVE')
  else if (message.removedBy !== 'AUTHOR') actions.push('RESTORE')
  if (message.status === 'HIDDEN') actions.push('REMOVE')
  if (message.author) actions.push('RESTRICT')
  return actions
}

export const MODERATION_LABELS: Record<MessageModerationAction, string> = {
  HIDE: 'Ocultar',
  REMOVE: 'Remover',
  RESTORE: 'Restaurar',
  RESTRICT: 'Silenciar ou banir o autor',
}

// Ações rápidas da moderação a partir do fórum (as mesmas da fila)
export function MessageModerationDialog({
  action,
  message,
  courseSlug,
  onClose,
}: {
  action: MessageModerationAction | null
  message: MessageView
  courseSlug: string
  onClose: () => void
}) {
  const refresh = useRefreshModeration()
  if (!action) return null
  const author = message.author ? { id: message.author.id, courseSlug } : null

  if (action === 'RESTRICT') {
    return (
      <ModerationDialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={`Restringir ${message.author?.name ?? 'o autor'}`}
        description="Vale só no fórum deste curso. A pessoa é avisada."
        confirmLabel="Restringir"
        destructive
        restriction="required"
        onConfirm={async ({ reason, restriction }) => {
          if (!author || !restriction) return false
          const result = await restrictUserAction({
            userId: author.id,
            courseSlug,
            type: restriction.type,
            reason,
            days: restriction.days,
          })
          if (!result.ok) {
            toast.error(result.problem.detail ?? 'Não foi possível restringir')
            return false
          }
          toast.success('Restrição aplicada')
          await refresh()
          return true
        }}
      />
    )
  }

  const copy = {
    HIDE: [
      'Ocultar mensagem',
      'Sai do ar para os leitores; o autor continua vendo.',
    ],
    REMOVE: [
      'Remover mensagem',
      'Os leitores veem só a categoria. O texto fica guardado e pode ser restaurado.',
    ],
    RESTORE: [
      'Restaurar mensagem',
      'A mensagem volta ao ar e as denúncias abertas são descartadas.',
    ],
  }[action]

  return (
    <ModerationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={copy[0]}
      description={copy[1]}
      confirmLabel={MODERATION_LABELS[action]}
      destructive={action === 'REMOVE'}
      category={action === 'REMOVE' ? 'OTHER' : undefined}
      restriction={author && action !== 'RESTORE' ? 'optional' : undefined}
      onConfirm={async (choice) => {
        const done = await applyModeration(message.id, action, choice, author)
        if (done) await refresh()
        return done
      }}
    />
  )
}
