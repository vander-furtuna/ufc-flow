import { PopupTrigger } from '@/components/filter/popups/popup-trigger'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useTools } from '@/contexts/tools'
import type { GroupBy } from '@/types/tools'
import { Group } from 'lucide-react'

const options = [
  { value: 'semester', label: 'Semestre' },
  { value: 'branch', label: 'Vertente' },
  { value: 'duration', label: 'Duração' },
]

export function GroupByPopup() {
  const { selectGroupBy, groupBy } = useTools()

  const handleSelectGroupBy = (value: GroupBy) => {
    selectGroupBy(value)
  }

  return (
    <Popover>
      <PopoverTrigger
        className="group"
        render={(props) => (
          <PopupTrigger
            icon={<Group className="size-4" />}
            label="Agrupar por"
            {...props}
          />
        )}
      />
      <PopoverContent
        className="border-border bg-accent/50 flex w-fit flex-col gap-4 backdrop-blur-md"
        side="top"
      >
        <strong className="text-foreground text-center">Agrupar por</strong>

        <RadioGroup
          defaultValue={groupBy}
          onValueChange={handleSelectGroupBy}
          className="gap-3"
        >
          {options.map((option) => (
            <div className="flex items-center gap-3" key={option.value}>
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </PopoverContent>
    </Popover>
  )
}
