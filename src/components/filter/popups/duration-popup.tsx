import { Clock } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { FilterCheckbox } from '@/components/filter-checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useFilter } from '@/contexts/filter'

import { ClearButton } from './clear-button'
import { PopupTrigger } from './popup-trigger'

export function DurationPopup() {
  const { durationFilter, changeDurationFilter, setDurationFilter } =
    useFilter()

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
      <PopoverTrigger
        className="group"
        render={(props) => (
          <PopupTrigger
            icon={<Clock className="size-4" />}
            label="Duração"
            isActive={isDurationFilterActive}
            {...props}
          />
        )}
      />
      <PopoverContent className="border-border flex w-44 flex-col gap-4 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50">
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
          <ClearButton onClick={() => setDurationFilter([])} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
