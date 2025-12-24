import SelectSemesterDialog from '@/components/dialogs/select-semester-dialog'
import { useClass } from '@/contexts/class'
import { CalendarFold, Loader2, RefreshCcw } from 'lucide-react'

export function SemesterTool() {
  const {
    currentSemester,
    currentYear,
    handleRefreshSubjectInformations,
    isClassLoading,
  } = useClass()

  return (
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
      <div className="bg-border h-4 w-px" />
      <button
        className="text-accent-foreground"
        onClick={handleRefreshSubjectInformations}
        disabled={isClassLoading}
      >
        {isClassLoading ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ) : (
          <RefreshCcw className="size-4" />
        )}
      </button>
    </div>
  )
}
