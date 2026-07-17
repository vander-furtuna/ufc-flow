'use client'

import { Download, Plus, Trash2 } from 'lucide-react'
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
  const textSize = isMobile ? 'text-sm' : 'text-xs'

  return (
    <div
      className="bg-accent/80 border-border/70 hover:bg-accent/90 flex h-10 w-full items-center rounded-lg border p-0 px-2 transition-colors"
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
            className={`ring-none w-full border-0 bg-transparent px-1 py-2 ${textSize} outline-none focus:ring-0`}
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

      <div className="bg-foreground/20 mx-1 h-4 w-px" />

      <CreateScheduleDialog>
        <button className="hover:bg-foreground/10 text-foreground/90 rounded-md p-1.5 transition-all">
          <Plus className={iconSize} />
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
          className="text-foreground/90 rounded-md p-1.5 transition-all hover:bg-red-600/10 hover:text-red-500 focus:bg-red-600/10 active:bg-red-600/20"
        >
          <Trash2 className={iconSize} />
        </button>
      </DestructiveDialog>
      <button
        className="text-foreground/90 rounded-md p-1.5 transition-all hover:bg-purple-600/10 hover:text-purple-500 focus:bg-purple-600/10 active:bg-purple-600/20"
        onClick={() => onDownloadSchedule?.()}
        id="tour-agenda-download"
      >
        <Download className={iconSize} />
      </button>
    </div>
  )
}
