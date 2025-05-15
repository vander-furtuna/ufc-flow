import { Calendar, X } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { useFilter } from '@/app/contexts/filter'
import { FilterCheckbox } from '@/components/filter-checkbox'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { PopupTrigger } from './popup-trigger'

export function SemesterPopup() {
  const totalOfSemesters = useMemo(
    () => Array.from({ length: 10 }, (_, i) => i + 1),
    [],
  )

  const { semesterFilter, changeSemesterFilter } = useFilter()

  const handleCheckedSemester = useCallback(
    (semester: string, checked: boolean) => {
      if (checked) {
        changeSemesterFilter(semester, 'add')
      } else {
        changeSemesterFilter(semester, 'remove')
      }
    },
    [changeSemesterFilter],
  )

  const isSemesterFilterActive = useMemo(
    () => semesterFilter.length > 0,
    [semesterFilter],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <PopupTrigger
          icon={<Calendar className="size-4" />}
          isActive={isSemesterFilterActive}
        />
      </PopoverTrigger>
      <PopoverContent className="flex w-36 flex-col gap-4 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50">
        <strong className="text-center text-slate-700 dark:text-slate-100">
          Semestres
        </strong>
        <div className="flex flex-wrap justify-center gap-4">
          {totalOfSemesters.map((semester) => (
            <fieldset
              key={semester}
              className="flex items-center justify-center gap-2 rounded-md"
            >
              <FilterCheckbox
                label={`${semester}º`}
                value={semester}
                checked={semesterFilter.includes(Number(semester))}
                onCheckedChange={handleCheckedSemester}
              />
            </fieldset>
          ))}
        </div>
        <div>
          <Button className="w-full gap-2 text-xs" variant="outline">
            <X className="size-4" />
            Limpar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
