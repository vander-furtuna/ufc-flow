import { Clock, X } from 'lucide-react'
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

export function DurationPopup() {
  const { setDurationFilter, filters } = useCourse()

  const durationOptions = useMemo(() => [32, 48, 64, 96], [])

  type FormData = {
    duration: string[]
  }

  const { register, watch, reset } = useForm<FormData>({
    defaultValues: {
      duration: filters.duration.map((duration) => duration.toString()),
    },
  })

  const duration = watch('duration')

  const handleClearDurationFilter = useCallback(() => {
    reset()
    setDurationFilter([])
  }, [setDurationFilter, reset])

  const isDurationFilterActive = useMemo(
    () => filters.duration.length > 0,
    [filters.duration],
  )

  useEffect(() => {
    setDurationFilter(duration)
  }, [duration, setDurationFilter])

  return (
    <Popover>
      <PopoverTrigger asChild className="group">
        <PopupTrigger
          icon={<Clock className="size-4" />}
          isActive={isDurationFilterActive}
        />
      </PopoverTrigger>
      <PopoverContent className="w-44 flex flex-col gap-4 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50">
        <strong className="text-center text-slate-600 dark:text-slate-100">
          Duração
        </strong>
        <form className="flex gap-x-8 gap-y-4 flex-wrap justify-center">
          {durationOptions.map((duration) => (
            <fieldset
              key={duration}
              className="flex items-center justify-center rounded-md gap-2"
            >
              <FilterCheckbox
                {...register('duration')}
                value={duration.toString()}
                label={`${duration}h`}
              />
            </fieldset>
          ))}
        </form>
        <div>
          <Button
            className="text-xs w-full gap-2"
            variant="outline"
            onClick={handleClearDurationFilter}
          >
            <X className="size-4" />
            Limpar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
