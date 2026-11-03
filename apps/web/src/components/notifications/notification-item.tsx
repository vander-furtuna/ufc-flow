'use client'

import {
  CalendarBlankIcon,
  ChatCircleIcon,
  ShieldCheckIcon,
  TrayArrowDownIcon,
  WarningIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { NotificationView } from '@ufc-flow/contracts'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  describeNotification,
  timeAgo,
  type NotificationCategory,
} from '@/lib/notifications/describe'
import { cn } from '@/lib/utils'

// Ícone e cores de cada categoria (mockup Agenda-Notificacoes)
const CATEGORY_STYLES: Record<
  NotificationCategory,
  { icon: Icon; className: string }
> = {
  Agenda: {
    icon: CalendarBlankIcon,
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  Fórum: {
    icon: ChatCircleIcon,
    className:
      'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  },
  Moderação: {
    icon: ShieldCheckIcon,
    className:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  },
  Turmas: {
    icon: WarningIcon,
    className: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  },
  Importações: {
    icon: TrayArrowDownIcon,
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
}

// Relógio para os tempos relativos, atualizado a cada minuto
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

export function NotificationItem({
  notification,
  now,
  onOpen,
}: {
  notification: NotificationView
  now: Date
  onOpen: (notification: NotificationView) => void
}) {
  const { category, parts, href } = describeNotification(notification)
  const { icon: CategoryIcon, className } = CATEGORY_STYLES[category]
  const unread = notification.readAt === null

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          className,
        )}
      >
        <CategoryIcon weight="bold" className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm leading-[1.45]">
        <span className={cn(!unread && 'text-foreground/85')}>
          {parts.map((part, index) =>
            part.bold ? (
              <b key={index} className="font-semibold">
                {part.text}
              </b>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {category} · {timeAgo(notification.updatedAt, now)}
        </span>
      </span>
      {unread && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-orange-500">
          <span className="sr-only">Não lida</span>
        </span>
      )}
    </>
  )

  const itemClass = cn(
    'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none',
    unread &&
      'bg-orange-50 hover:bg-orange-100/70 dark:bg-orange-500/10 dark:hover:bg-orange-500/15',
  )

  return href ? (
    <Link
      href={href}
      className={itemClass}
      onClick={() => onOpen(notification)}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      className={itemClass}
      onClick={() => onOpen(notification)}
    >
      {content}
    </button>
  )
}
