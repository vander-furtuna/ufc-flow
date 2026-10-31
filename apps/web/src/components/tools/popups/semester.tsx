import SelectSemesterDialog from '@/components/dialogs/select-semester-dialog'
import { useClass } from '@/contexts/class'
import {
  ArrowCounterClockwiseIcon,
  CalendarBlankIcon,
  CircleNotchIcon,
} from '@phosphor-icons/react'

export function SemesterTool() {
  const {
    currentSemester,
    currentYear,
    handleRefreshSubjectInformations,
    isClassLoading,
  } = useClass()

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-accent px-2.5">
      <SelectSemesterDialog
        currentSemester={currentSemester ?? 2}
        currentYear={currentYear ?? 2025}
      >
        <button
          className="group/filter relative flex shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full py-1.5"
          disabled={isClassLoading}
        >
          <CalendarBlankIcon
            weight="bold"
            className="z-10 size-4 text-muted-foreground group-data-[active=active]/filter:text-foreground"
          />
          <span className="z-10 text-xs text-nowrap">
            {currentYear}.{currentSemester}
          </span>
        </button>
      </SelectSemesterDialog>
      <div className="h-4 w-px bg-border" />
      <button
        className="text-accent-foreground"
        onClick={handleRefreshSubjectInformations}
        disabled={isClassLoading}
      >
        {isClassLoading ? (
          <CircleNotchIcon
            weight="bold"
            className="size-4 animate-spin text-muted-foreground"
          />
        ) : (
          <ArrowCounterClockwiseIcon weight="bold" className="size-4" />
        )}
      </button>
    </div>
  )
}
