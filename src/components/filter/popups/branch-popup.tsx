import { Split, X } from 'lucide-react'
import { lighten, saturate } from 'polished'
import { useCallback, useMemo } from 'react'

import { useCourse } from '@/app/contexts/course'
import { useFilter } from '@/app/contexts/filter'
import { FilterCheckbox } from '@/components/filter-checkbox'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { PopupTrigger } from './popup-trigger'

export function BranchPopup() {
  const { selectedCurriculum } = useCourse()
  const { branchFilter, natureFilter, changeBranchFilter, changeNatureFilter } =
    useFilter()

  const isNatureAndBranchFilterActive = useMemo(
    () => branchFilter.length > 0 || natureFilter.length > 0,
    [branchFilter, natureFilter],
  )

  const handleCheckBranch = useCallback(
    (branch: string, checked: boolean) => {
      if (checked) {
        changeBranchFilter(branch, 'add')
      } else {
        changeBranchFilter(branch, 'remove')
      }
    },
    [changeBranchFilter],
  )

  const handleCheckNature = useCallback(
    (nature: string, checked: boolean) => {
      if (checked) {
        changeNatureFilter(nature, 'add')
      } else {
        changeNatureFilter(nature, 'remove')
      }
    },
    [changeNatureFilter],
  )

  return (
    <Popover>
      <PopoverTrigger asChild className="group">
        <PopupTrigger
          icon={<Split className="size-4" />}
          isActive={isNatureAndBranchFilterActive}
        />
      </PopoverTrigger>
      <PopoverContent className="flex w-fit flex-col gap-4 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50">
        <strong className="text-center text-slate-600 dark:text-slate-100">
          Tipo / Vertente
        </strong>
        <div className="flex w-fit flex-col justify-center gap-x-8 gap-y-4">
          <fieldset className="flex items-center justify-start gap-2 rounded-md">
            <FilterCheckbox
              value="OBRIGATÓRIA"
              checked={natureFilter.includes('OBRIGATÓRIA')}
              onCheckedChange={handleCheckNature}
            />
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
            <FilterCheckbox
              value="OPTATIVA"
              checked={natureFilter.includes('OPTATIVA')}
              onCheckedChange={handleCheckNature}
            />
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
              <FilterCheckbox
                value={branch.id}
                checked={branchFilter.includes(branch.id)}
                onCheckedChange={handleCheckBranch}
              />
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
