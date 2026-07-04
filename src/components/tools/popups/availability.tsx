import { PopupTrigger } from '@/components/filter/popups/popup-trigger'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { useTools } from '@/contexts/tools'
import type { Availability } from '@/types/tools'
import { Check } from 'lucide-react'

const options = [
  { value: 'all', label: 'Todas' },
  { value: 'available', label: 'Disponíveis' },
  { value: 'unavailable', label: 'Indisponíveis' },
]

export function AvailabilityPopup() {
  const {
    selectAvailability,
    availability,
    highlightUnavailable,
    setHighlightUnavailable,
  } = useTools()

  const handleSelectAvailability = (value: Availability) => {
    selectAvailability(value)
  }

  return (
    <Popover>
      <PopoverTrigger asChild className="group">
        <PopupTrigger
          icon={<Check className="size-4" />}
          label="Disponibilidade"
        />
      </PopoverTrigger>
      <PopoverContent
        className="border-border bg-accent/50 flex w-fit flex-col gap-4 backdrop-blur-md"
        side="top"
      >
        <strong className="text-foreground text-center">Disponibilidade</strong>

        <RadioGroup
          defaultValue={availability}
          onValueChange={handleSelectAvailability}
          className="gap-3"
        >
          {options.map((option) => (
            <div className="flex items-center gap-3" key={option.value}>
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>

        <Separator className="bg-border" />

        <div className="flex items-center gap-3">
          <Checkbox
            id="highlight-unavailable"
            checked={highlightUnavailable}
            onCheckedChange={(checked) =>
              setHighlightUnavailable(checked === true)
            }
          />
          <Label
            htmlFor="highlight-unavailable"
            className="cursor-pointer text-sm font-normal"
          >
            Destacar disciplinas indisponíveis
          </Label>
        </div>
      </PopoverContent>
    </Popover>
  )
}
