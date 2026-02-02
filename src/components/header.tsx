'use client'

import { useClass } from '@/contexts/class'
import SelectSemesterDialog from './dialogs/select-semester-dialog'
import { Logo } from './logo'
import { ModeToggle } from './theme-toggle'
import { CalendarDays, CalendarFold } from 'lucide-react'
import { Button } from './ui/button'
import Link from 'next/link'

export function Header() {
  const { currentSemester, currentYear, isClassLoading } = useClass()

  return (
    <header className="flex w-full items-start justify-between">
      <div>
        <Logo className="h-12 w-auto sm:h-14" />
      </div>
      <div className="flex items-center gap-0.5">
        <div className="bg-accent border-border flex items-center gap-2 rounded-full border px-2">
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
        <Link href="/calendario">
          <Button variant="ghost" size="icon">
            <CalendarDays className="text-muted-foreground size-5 transition-all duration-300" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
