import { Clock, X } from 'lucide-react'
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

export function DurationPopup() {
  const { durationFilter, changeDurationFilter } = useFilter()

  const durationOptions = useMemo(() => [32, 48, 64, 96], [])

  const handleCheckDuration = useCallback(
    (duration: string, checked: boolean) => {
      if (checked) {
        changeDurationFilter(duration, 'add')
      } else {
        changeDurationFilter(duration, 'remove')
      }
    },
    [changeDurationFilter],
  )

  const isDurationFilterActive = useMemo(
    () => durationFilter.length > 0,
    [durationFilter],
  )

  return (
    <Popover>
      <PopoverTrigger asChild className="group">
        <PopupTrigger
          icon={<Clock className="size-4" />}
          isActive={isDurationFilterActive}
        />
      </PopoverTrigger>
      <PopoverContent className="flex w-44 flex-col gap-4 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50">
        <strong className="text-center text-slate-600 dark:text-slate-100">
          Duração
        </strong>
        <form className="flex flex-wrap justify-center gap-x-8 gap-y-4">
          {durationOptions.map((duration) => (
            <fieldset
              key={duration}
              className="flex items-center justify-center gap-2 rounded-md"
            >
              <FilterCheckbox
                onCheckedChange={handleCheckDuration}
                value={duration.toString()}
                checked={durationFilter.includes(Number(duration))}
                label={`${duration}h`}
              />
            </fieldset>
          ))}
        </form>
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
