'use client'

import { BellIcon } from '@phosphor-icons/react'
import type { NotificationView } from '@ufc-flow/contracts'
import Link from 'next/link'
import { useState } from 'react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useSession } from '@/lib/auth/use-session'
import {
  useMarkRead,
  useNotificationList,
  useUnreadCount,
} from '@/lib/notifications/use-notifications'
import { cn } from '@/lib/utils'

import { NotificationItem, useNow } from './notification-item'
import { NotificationPreferencesDialog } from './notification-preferences'

const bellClass =
  'relative flex size-9 shrink-0 items-center justify-center rounded-full border bg-accent text-foreground/90 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span
      aria-hidden
      className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] leading-none font-bold text-white ring-2 ring-background"
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

const bellLabel = (count: number) =>
  count === 0
    ? 'Notificações'
    : `Notificações, ${count} não ${count === 1 ? 'lida' : 'lidas'}`

// Painel do mockup Agenda-Notificacoes: as mais recentes, marcar todas,
// "Ver todas" e preferências
function NotificationPanel({
  open,
  onNavigate,
  onPreferences,
}: {
  open: boolean
  onNavigate: () => void
  onPreferences: () => void
}) {
  const now = useNow()
  const list = useNotificationList({ unread: false, enabled: open })
  const markRead = useMarkRead()
  const items = (list.data?.pages[0]?.items ?? []).slice(0, 8)
  const hasUnread = items.some((item) => item.readAt === null)

  const openItem = (notification: NotificationView) => {
    if (notification.readAt === null) {
      markRead.mutate({ ids: [notification.id] })
    }
    onNavigate()
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <h2 className="font-clash text-lg font-semibold">Notificações</h2>
        <button
          type="button"
          disabled={!hasUnread || markRead.isPending}
          onClick={() => markRead.mutate({ all: true })}
          className="h-8 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          Marcar todas como lidas
        </button>
      </div>
      <div className="max-h-[min(28rem,70dvh)] overflow-y-auto">
        {list.isPending ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Carregando…</p>
        ) : list.isError ? (
          <p className="px-4 py-6 text-sm text-red-700 dark:text-red-400">
            Não foi possível carregar as notificações.
          </p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Nenhuma notificação por aqui.
          </p>
        ) : (
          <ul aria-label="Notificações recentes">
            {items.map((item) => (
              <li key={item.id}>
                <NotificationItem
                  notification={item}
                  now={now}
                  onOpen={openItem}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3 text-[13px]">
        <Link
          href="/notificacoes"
          onClick={onNavigate}
          className="font-semibold underline underline-offset-2 hover:text-foreground"
        >
          Ver todas
        </Link>
        <button
          type="button"
          onClick={onPreferences}
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Preferências
        </button>
      </div>
    </div>
  )
}

// Sino com o contador de não lidas. Só aparece logado. No celular leva para
// /notificacoes; a partir de 768 px abre o painel.
export function NotificationBell({
  side = 'bottom',
  align = 'end',
  className,
}: {
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  const { data: user } = useSession()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { data: count = 0 } = useUnreadCount()
  const [open, setOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  if (!user) return null

  if (isMobile) {
    return (
      <Link
        href="/notificacoes"
        aria-label={bellLabel(count)}
        className={cn(bellClass, className)}
      >
        <BellIcon weight="bold" className="size-4.5" />
        <Badge count={count} />
      </Link>
    )
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={bellLabel(count)}
          className={cn(bellClass, className)}
        >
          <BellIcon weight="bold" className="size-4.5" />
          <Badge count={count} />
        </PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          sideOffset={8}
          className="w-[400px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[20px] p-0 shadow-xl"
        >
          <NotificationPanel
            open={open}
            onNavigate={() => setOpen(false)}
            onPreferences={() => {
              setOpen(false)
              setPreferencesOpen(true)
            }}
          />
        </PopoverContent>
      </Popover>
      <NotificationPreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </>
  )
}
