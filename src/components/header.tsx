'use client'

import { useClass } from '@/contexts/class'
import SelectSemesterDialog from './dialogs/select-semester-dialog'
import { Logo } from './logo'
import { ModeToggle } from './theme-toggle'
import { CalendarFold } from 'lucide-react'

export function Header() {
  const {
    currentSemester,
    currentYear,
    handleRefreshSubjectInformations,
    isClassLoading,
  } = useClass()

  return (
    <header className="flex w-full items-start justify-between">
      <div>
        <Logo className="h-14 w-auto" />
      </div>
      <div className="flex items-center gap-1">
        <div className="bg-accent border-border flex items-center gap-2 rounded-full border px-2.5">
          <SelectSemesterDialog
            currentSemester={currentSemester ?? 2}
            currentYear={currentYear ?? 2025}
          >
            <button
              className="group/filter relative flex shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full py-1.5"
              disabled={isClassLoading}
            >
              <CalendarFold className="text-muted-foreground group-data-[active=active]/filter:text-foreground z-10 size-4" />
              <span className="z-10 text-xs text-nowrap">
                {currentYear}.{currentSemester}
              </span>
            </button>
          </SelectSemesterDialog>
        </div>

        <ModeToggle />
      </div>
    </header>
  )
}
