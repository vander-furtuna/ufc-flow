import { Tag } from 'lucide-react'
import { lighten, saturate } from 'polished'
import { useCallback, useMemo } from 'react'

import { FilterCheckbox } from '@/components/filter-checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCourse } from '@/contexts/course'
import { useFilter } from '@/contexts/filter'

import { ClearButton } from './clear-button'
import { PopupTrigger } from './popup-trigger'

export function BranchPopup() {
  const { selectedCurriculum } = useCourse()
  const {
    branchFilter,
    natureFilter,
    changeBranchFilter,
    changeNatureFilter,
    setBranchFilter,
    setNatureFilter,
  } = useFilter()

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
          icon={<Tag className="size-4" />}
          label="Tipo"
          isActive={isNatureAndBranchFilterActive}
        />
      </PopoverTrigger>
      <PopoverContent className="border-border flex w-fit flex-col gap-4 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50">
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
              className="text-center text-sm text-nowrap"
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
              className="text-center text-sm text-nowrap"
            >
              Optativa
            </label>
          </fieldset>
          <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
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
                className="text-center text-sm text-nowrap"
              >
                {branch.name}
              </label>
            </fieldset>
          ))}
        </div>
        <div>
          <ClearButton
            onClick={() => {
              setBranchFilter([])
              setNatureFilter([])
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
