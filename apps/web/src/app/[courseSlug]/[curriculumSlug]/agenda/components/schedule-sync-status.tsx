'use client'

import {
  CloudCheckIcon,
  CloudSlashIcon,
  CloudArrowUpIcon,
  HardDrivesIcon,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useClass } from '@/contexts/class'
import { useSchedule } from '@/contexts/schedule'
import { cn } from '@/lib/utils'

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

function since(timestamp: number, now: number) {
  const minutes = Math.round((now - timestamp) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return relative.format(-minutes, 'minute')
  return relative.format(-Math.round(minutes / 60), 'hour')
}

// Onde a agenda está guardada: na conta (com o estado da sincronização) ou
// só neste navegador, com o convite para entrar. A versão compacta (barra do
// celular) troca o horário da sincronização pelo semestre e as disciplinas.
export function ScheduleSyncStatus({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const { sync, isScheduleLoading, scheduleClasses } = useSchedule()
  const { currentYear, currentSemester } = useClass()
  const pathname = usePathname()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  if (isScheduleLoading) return null

  const base = cn('flex items-center gap-1.5 text-xs', className)
  const count = scheduleClasses.length
  const summary = ` · ${currentYear}.${currentSemester} · ${count} ${count === 1 ? 'disciplina' : 'disciplinas'}`

  if (sync.mode === 'local') {
    return (
      <p className={cn(base, 'text-muted-foreground')}>
        <HardDrivesIcon className="size-3.5 shrink-0" aria-hidden />
        <span>
          Salva neste navegador
          {compact ? summary : ' · '}
          {!compact && (
            <Link
              href={`/entrar?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Entre
            </Link>
          )}
          {!compact && ' para usar em outros aparelhos'}
        </span>
      </p>
    )
  }

  if (sync.status === 'saving') {
    return (
      <output className={cn(base, 'text-muted-foreground')}>
        <CloudArrowUpIcon className="size-3.5 shrink-0" aria-hidden />
        Salvando na sua conta…
      </output>
    )
  }

  if (sync.status === 'error') {
    return (
      <output className={cn(base, 'text-red-700 dark:text-red-400')}>
        <CloudSlashIcon className="size-3.5 shrink-0" aria-hidden />
        Não foi possível sincronizar a última alteração
      </output>
    )
  }

  return (
    <output className={cn(base, 'text-green-700 dark:text-green-400')}>
      <CloudCheckIcon className="size-3.5 shrink-0" aria-hidden />
      {compact ? `Salva na conta${summary}` : 'Salva na sua conta'}
      {!compact && sync.lastSyncedAt
        ? ` · sincronizada ${since(sync.lastSyncedAt, now)}`
        : ''}
    </output>
  )
}
