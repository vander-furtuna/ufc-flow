'use client'

import type { NotificationType } from '@ufc-flow/contracts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSession } from '@/lib/auth/use-session'
import {
  getNotificationPreferencesAction,
  saveNotificationPreferencesAction,
} from '@/lib/notifications/notification-actions'
import { NOTIFICATIONS_KEY } from '@/lib/notifications/use-notifications'

type Option = { type: NotificationType; label: string }
type Group = { title: string; options: Option[] }

// Só aparece o que a pessoa pode receber: moderação e coleta para quem
// modera, importações e pedidos para admin
function groupsFor(isAdmin: boolean, isModerator: boolean): Group[] {
  return [
    {
      title: 'Agenda',
      options: [
        {
          type: 'SCHEDULE_SECTION_CHANGED',
          label: 'Turma da minha agenda mudou de horário',
        },
        {
          type: 'SCHEDULE_SECTION_REMOVED',
          label: 'Turma da minha agenda saiu do SIGAA',
        },
      ],
    },
    {
      title: 'Fórum',
      options: [
        {
          type: 'FORUM_REPLY' as const,
          label: 'Respostas às minhas mensagens',
        },
        {
          type: 'FORUM_THREAD_REPLY' as const,
          label: 'Respostas nas conversas em que estou',
        },
        {
          type: 'FORUM_LIKES' as const,
          label: 'Curtidas nas minhas mensagens',
        },
        {
          type: 'MESSAGE_MODERATED' as const,
          label: 'Moderação das minhas mensagens',
        },
        { type: 'USER_RESTRICTED' as const, label: 'Restrições no fórum' },
      ],
    },
    {
      title: 'Moderação',
      options: [
        {
          type: 'MODERATOR_REQUEST_REVIEWED' as const,
          label: 'Resposta à minha solicitação de moderação',
        },
        ...(isAdmin
          ? [
              {
                type: 'MODERATOR_REQUEST_CREATED' as const,
                label: 'Nova solicitação de moderação',
              },
            ]
          : []),
      ],
    },
    ...(isAdmin || isModerator
      ? [
          {
            title: 'Turmas',
            options: [
              {
                type: 'SCRAPE_FAILED' as const,
                label: 'Falha na coleta de turmas',
              },
            ],
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            title: 'Importações',
            options: [
              {
                type: 'IMPORT_PENDING' as const,
                label: 'Estrutura aguardando a criação do curso',
              },
            ],
          },
        ]
      : []),
  ]
}

function PreferencesForm({
  initialMuted,
  groups,
  onSaved,
}: {
  initialMuted: NotificationType[]
  groups: Group[]
  onSaved: () => void
}) {
  const id = useId()
  const [muted, setMuted] = useState(() => new Set(initialMuted))
  const [pending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const save = () =>
    startTransition(async () => {
      const result = await saveNotificationPreferencesAction({
        muted: [...muted],
      })
      if (!result.ok) {
        toast.error('Não foi possível salvar as preferências', {
          description: result.problem.detail,
        })
        return
      }
      queryClient.setQueryData(
        [...NOTIFICATIONS_KEY, 'preferences'],
        result.data,
      )
      toast.success('Preferências salvas')
      onSaved()
    })

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <fieldset key={group.title} className="flex flex-col gap-2.5">
          <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.title}
          </legend>
          {group.options.map((option) => {
            const inputId = `${id}-${option.type}`
            return (
              <div
                key={option.type}
                className="flex min-h-11 items-center gap-3"
              >
                <Checkbox
                  id={inputId}
                  checked={!muted.has(option.type)}
                  onCheckedChange={(checked) =>
                    setMuted((current) => {
                      const next = new Set(current)
                      if (checked === true) next.delete(option.type)
                      else next.add(option.type)
                      return next
                    })
                  }
                  className="size-5 rounded-md"
                />
                <label htmlFor={inputId} className="text-sm">
                  {option.label}
                </label>
              </div>
            )
          })}
        </fieldset>
      ))}
      <div className="flex justify-end">
        <Button onClick={save} isLoading={pending}>
          Salvar preferências
        </Button>
      </div>
    </div>
  )
}

// Quais notificações a pessoa quer receber (as desmarcadas são silenciadas)
export function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: user } = useSession()
  const preferences = useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'preferences'],
    queryFn: async () => {
      const result = await getNotificationPreferencesAction()
      if (!result.ok) throw new Error(result.problem.detail)
      return result.data
    },
    enabled: open && Boolean(user),
  })
  const groups = groupsFor(
    user?.roles.includes('ADMIN') ?? false,
    (user?.moderatedCourses.length ?? 0) > 0,
  )

  let body: ReactNode
  if (preferences.data) {
    body = (
      <PreferencesForm
        initialMuted={preferences.data.muted}
        groups={groups}
        onSaved={() => onOpenChange(false)}
      />
    )
  } else if (preferences.isError) {
    body = (
      <p className="text-sm text-red-700 dark:text-red-400">
        Não foi possível carregar as preferências.
      </p>
    )
  } else {
    body = <p className="text-sm text-muted-foreground">Carregando…</p>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[950] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-clash text-xl font-semibold">
            Preferências de notificação
          </DialogTitle>
          <DialogDescription>
            Escolha o que aparece no sino. As notificações ficam só no UFC Flow.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
