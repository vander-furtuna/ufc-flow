'use client'

import { DownloadSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateScheduleDialog } from '../create-schedule-dialog'
import { DestructiveDialog } from '@/components/dialogs/destructive-dialog'
import { useSchedule } from '@/contexts/schedule'
import { cn } from '@/lib/utils'

export function ScheduleControls({
  onDownloadSchedule,
  isMobile = false,
}: {
  onDownloadSchedule?: () => void
  isMobile?: boolean
}) {
  const { currentSchedule, schedules, selectSchedule, deleteSchedule } =
    useSchedule()

  if (!currentSchedule || schedules.length === 0) return null

  const iconSize = isMobile ? 'size-4.5' : 'size-4'
  const textSize = 'text-sm font-medium'
  const iconButton = cn(
    'flex shrink-0 items-center justify-center rounded-lg text-foreground/90 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    'size-8',
  )

  return (
    <div
      className={cn(
        'flex h-11 w-full min-w-0 items-center gap-0.5 rounded-[14px] border pr-1 pl-2 transition-colors',
        isMobile ? 'bg-background' : 'bg-muted/50',
      )}
      id="tour-agenda-controls"
    >
      <div className="relative w-full">
        <Select
          value={currentSchedule.id || ''}
          onValueChange={(value) =>
            selectSchedule(schedules.find((s) => s.id === value)!)
          }
        >
          <SelectTrigger
            aria-label="Agenda"
            className={`ring-none w-full min-w-0 justify-between gap-1 border-0 bg-transparent px-1 py-2 text-left ${textSize} outline-none focus:ring-0 [&>span]:truncate`}
          >
            <SelectValue placeholder="Agenda" className={textSize} />
          </SelectTrigger>
          <SelectContent className="z-900">
            {schedules.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mx-1 h-4 w-px bg-foreground/20" />

      <CreateScheduleDialog>
        <button
          type="button"
          aria-label="Nova agenda"
          className={cn(iconButton, 'hover:bg-foreground/10')}
        >
          <PlusIcon weight="bold" className={iconSize} />
        </button>
      </CreateScheduleDialog>
      <DestructiveDialog
        title="Excluir Agenda"
        description="Tem certeza que deseja excluir agenda? Essa ação é IRREVERSÍVEL!"
        confirmButtonText="Excluir"
        onConfirm={() => deleteSchedule(currentSchedule.id)}
      >
        <button
          type="button"
          id="tour-agenda-delete"
          aria-label="Excluir agenda"
          className={cn(
            iconButton,
            'hover:bg-red-600/10 hover:text-red-500 active:bg-red-600/20',
          )}
        >
          <TrashIcon weight="bold" className={iconSize} />
        </button>
      </DestructiveDialog>
      <button
        type="button"
        aria-label="Baixar como imagem"
        className={cn(iconButton, 'hover:bg-foreground/10')}
        onClick={() => onDownloadSchedule?.()}
        id="tour-agenda-download"
      >
        <DownloadSimpleIcon weight="bold" className={iconSize} />
      </button>
    </div>
  )
}
