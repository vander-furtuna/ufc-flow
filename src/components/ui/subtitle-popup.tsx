import { Info } from 'lucide-react'
import { lighten, saturate } from 'polished'

import { useCourse } from '@/app/contexts/course'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { Button } from './button'

export function SubtitlePopup() {
  const { selectedCurriculum } = useCourse()

  return (
    <Popover>
      <PopoverTrigger asChild className="group">
        <Button size="icon" variant="ghost">
          <Info className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-fit flex-col gap-4 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50">
        <strong className="text-center text-slate-600 dark:text-slate-100">
          Tipo / Vertente
        </strong>
        <div className="flex w-fit flex-col justify-center gap-x-8 gap-y-4">
          <fieldset className="flex items-center justify-start gap-2 rounded-md">
            <div
              className="bg h-2 w-4 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, '#f97316'))}, #f97316)`,
              }}
            />
            <label
              htmlFor="compulsory"
              className="text-nowrap text-center text-sm"
            >
              Obrigatória
            </label>
          </fieldset>
          <fieldset className="flex items-center justify-start gap-2 rounded-md">
            <div
              className="bg h-2 w-4 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, '#7c3aed'))}, #7c3aed)`,
              }}
            />
            <label
              htmlFor="optional"
              className="text-nowrap text-center text-sm"
            >
              Optativa
            </label>
          </fieldset>
          <div className="h-[1px] w-full bg-slate-200 dark:bg-slate-700" />
          {selectedCurriculum?.branchs.map((branch) => (
            <fieldset
              key={branch.id}
              className="flex items-center justify-start gap-2 rounded-md"
            >
              <div
                className="bg h-2 w-4 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, branch.color))}, ${branch.color})`,
                }}
              />
              <label
                htmlFor={`${branch.id}-branch`}
                className="text-nowrap text-center text-sm"
              >
                {branch.name}
              </label>
            </fieldset>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
