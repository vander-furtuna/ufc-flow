'use client'

import { CaretLeftIcon, SlidersHorizontalIcon } from '@phosphor-icons/react'
import type { NotificationView } from '@ufc-flow/contracts'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  NotificationItem,
  useNow,
} from '@/components/notifications/notification-item'
import { NotificationPreferencesDialog } from '@/components/notifications/notification-preferences'
import { Button } from '@/components/ui/button'
import { dayGroup } from '@/lib/notifications/describe'
import {
  useMarkRead,
  useNotificationList,
  useUnreadCount,
} from '@/lib/notifications/use-notifications'
import { cn } from '@/lib/utils'

const GROUPS = ['Hoje', 'Ontem', 'Antes'] as const

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-background text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

export function NotificationsPage() {
  const router = useRouter()
  const now = useNow()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const { data: unread = 0 } = useUnreadCount()
  const list = useNotificationList({ unread: unreadOnly })
  const markRead = useMarkRead()
  const items = list.data?.pages.flatMap((page) => page.items) ?? []

  const openItem = (notification: NotificationView) => {
    if (notification.readAt === null) {
      markRead.mutate({ ids: [notification.id] })
    }
  }

  const groups = GROUPS.map((label) => ({
    label,
    items: items.filter((item) => dayGroup(item.updatedAt, now) === label),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="flex min-h-dvh w-full justify-center">
      <section className="flex w-full max-w-2xl flex-col pb-16 md:pt-8">
        <header className="flex items-center gap-2 px-3 pt-4 pb-2 md:px-4">
          <button
            type="button"
            aria-label="Voltar"
            // Aberta direto (sem histórico), volta para os cursos
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push('/cursos')
            }
            className="flex size-11 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CaretLeftIcon weight="bold" className="size-5" />
          </button>
          <h1 className="flex-1 font-clash text-2xl font-semibold">
            Notificações
          </h1>
          <button
            type="button"
            aria-label="Preferências de notificação"
            onClick={() => setPreferencesOpen(true)}
            className="flex size-11 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <SlidersHorizontalIcon weight="bold" className="size-5" />
          </button>
        </header>

        <div className="flex items-center gap-2 border-b px-5 pb-3 md:px-4">
          <FilterPill active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
            Todas
          </FilterPill>
          <FilterPill active={unreadOnly} onClick={() => setUnreadOnly(true)}>
            Não lidas · {unread}
          </FilterPill>
          <button
            type="button"
            disabled={unread === 0 || markRead.isPending}
            onClick={() => markRead.mutate({ all: true })}
            className="ml-auto h-9 rounded-lg px-2 text-[13px] font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          >
            Marcar lidas
          </button>
        </div>

        {list.isPending ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Carregando…</p>
        ) : list.isError ? (
          <p className="px-5 py-8 text-sm text-red-700 dark:text-red-400">
            Não foi possível carregar as notificações.
          </p>
        ) : groups.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            {unreadOnly
              ? 'Tudo lido por aqui.'
              : 'Nenhuma notificação por aqui.'}
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-labelledby={`grupo-${group.label}`}>
              <h2
                id={`grupo-${group.label}`}
                className="px-5 pt-4 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:px-4"
              >
                {group.label}
              </h2>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NotificationItem
                      notification={item}
                      now={now}
                      onOpen={openItem}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {list.hasNextPage && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              isLoading={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              Carregar mais
            </Button>
          </div>
        )}
      </section>
      <NotificationPreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </div>
  )
}
