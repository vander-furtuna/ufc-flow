import { Calendar, X } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { useCourse } from '@/app/contexts/course'
import { FilterCheckbox } from '@/components/filter-checkbox'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { PopupTrigger } from './popup-trigger'

type FormData = {
  semester: string[]
}

export function SemesterPopup() {
  const totalOfSemesters = useMemo(
    () => Array.from({ length: 10 }, (_, i) => i + 1),
    [],
  )

  const { setSemesterFilter, filters } = useCourse()

  const { register, watch, reset } = useForm<FormData>({
    defaultValues: {
      semester: filters.semester.map((semester) => semester.toString()),
    },
  })
  const semester = watch('semester')

  const handleClearFilters = useCallback(() => {
    setSemesterFilter([])
    reset()
  }, [setSemesterFilter, reset])

  const isSemesterFilterActive = useMemo(
    () => filters.semester.length > 0,
    [filters.semester],
  )

  useEffect(() => {
    setSemesterFilter(semester)
  }, [semester, setSemesterFilter])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <PopupTrigger
          icon={<Calendar className="size-4" />}
          isActive={isSemesterFilterActive}
        />
      </PopoverTrigger>
      <PopoverContent className="w-36 flex flex-col gap-4 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50">
        <strong className="text-center text-slate-700 dark:text-slate-100">
          Semestres
        </strong>
        <div className="flex gap-4 flex-wrap justify-center">
          {totalOfSemesters.map((semester) => (
            <fieldset
              key={semester}
              className="flex items-center justify-center rounded-md gap-2"
            >
              <FilterCheckbox
                {...register('semester')}
                value={semester}
                label={`${semester}º`}
              />
            </fieldset>
          ))}
        </div>
        <div>
          <Button
            className="text-xs w-full gap-2"
            variant="outline"
            onClick={handleClearFilters}
          >
            <X className="size-4" />
            Limpar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
