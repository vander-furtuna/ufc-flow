'use client'

import { DotsThreeIcon, FileTextIcon } from '@phosphor-icons/react'
import type { ActivityRecordView } from '@ufc-flow/contracts'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fileUrl } from '@/lib/files/upload'

import { ACTIVITY_KIND_LABELS } from './activity-dialog'

const monthYear = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

// "mar. de 2025 – jul. de 2025"
export function activityPeriod(activity: ActivityRecordView) {
  const start = monthYear.format(new Date(activity.startedOn))
  if (!activity.endedOn) return start
  const end = monthYear.format(new Date(activity.endedOn))
  return start === end ? start : `${start} – ${end}`
}

// Uma atividade na lista; sem onEdit/onDelete fica só leitura
export function ActivityItem({
  activity,
  categoryName,
  onEdit,
  onDelete,
}: {
  activity: ActivityRecordView
  categoryName: string | null
  onEdit?: () => void
  onDelete?: () => void
}) {
  const meta = [
    categoryName ?? ACTIVITY_KIND_LABELS[activity.kind],
    activity.institution,
    activityPeriod(activity),
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <li className="flex items-center gap-3 border-t px-4 py-3 first:border-t-0 sm:px-5">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{activity.title}</span>
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </div>
      {activity.certificateFileId ? (
        <a
          href={fileUrl(activity.certificateFileId)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Certificado de ${activity.title}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <FileTextIcon className="size-5" />
        </a>
      ) : (
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          sem certificado
        </span>
      )}
      <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">
        {activity.hours} h
      </span>
      {onEdit && onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Ações de ${activity.title}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <DotsThreeIcon weight="bold" className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onDelete}
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  )
}
