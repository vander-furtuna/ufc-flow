import { Split, X } from 'lucide-react'
import { lighten, saturate } from 'polished'
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
  branch: string[]
  nature: string[]
}

export function BranchPopup() {
  const { selectedCurriculum, setBranchFilter, setNatureFilter, filters } =
    useCourse()

  const { register, watch, reset } = useForm<FormData>({
    defaultValues: {
      branch: filters.branch,
      nature: filters.nature,
    },
  })

  const branch = watch('branch')
  const nature = watch('nature')

  const isNatureAndBranchFilterActive = useMemo(
    () => filters.branch.length > 0 || filters.nature.length > 0,
    [filters.branch, filters.nature],
  )

  const handleClearFilters = useCallback(() => {
    setBranchFilter([])
    setNatureFilter([])
    reset()
  }, [setBranchFilter, setNatureFilter, reset])

  useEffect(() => {
    setBranchFilter(branch)
  }, [branch, setBranchFilter])

  useEffect(() => {
    setNatureFilter(nature)
  }, [nature, setNatureFilter])

  return (
    <Popover>
      <PopoverTrigger asChild className="group">
        <PopupTrigger
          icon={<Split className="size-4" />}
          isActive={isNatureAndBranchFilterActive}
        />
      </PopoverTrigger>
      <PopoverContent className="w-fit flex flex-col gap-4 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50">
        <strong className="text-center text-slate-600 dark:text-slate-100">
          Tipo / Vertente
        </strong>
        <div className="flex flex-col gap-x-8 gap-y-4 justify-center w-fit">
          <fieldset className="flex items-center justify-start rounded-md gap-2">
            <FilterCheckbox {...register('nature')} value="OBRIGATÓRIA" />
            <div
              className="h-2 w-4 rounded-full bg"
              style={{
                background: `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, '#f97316'))}, #f97316)`,
              }}
            />
            <label
              htmlFor="compulsory"
              className="text-center text-nowrap text-sm"
            >
              Obrigatória
            </label>
          </fieldset>
          <fieldset className="flex items-center justify-start rounded-md gap-2">
            <FilterCheckbox {...register('nature')} value="OPTATIVA" />
            <div
              className="h-2 w-4 rounded-full bg"
              style={{
                background: `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, '#7c3aed'))}, #7c3aed)`,
              }}
            />
            <label
              htmlFor="optional"
              className="text-center text-nowrap text-sm"
            >
              Optativa
            </label>
          </fieldset>
          <div className="w-full h-[2px] bg-slate-200" />
          {selectedCurriculum?.branchs.map((branch) => (
            <fieldset
              key={branch.id}
              className="flex items-center justify-start rounded-md gap-2"
            >
              <FilterCheckbox {...register('branch')} value={branch.id} />
              <div
                className="h-2 w-4 rounded-full bg"
                style={{
                  background: `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, branch.color))}, ${branch.color})`,
                }}
              />
              <label
                htmlFor={`${branch.id}-branch`}
                className="text-center text-nowrap text-sm"
              >
                {branch.name}
              </label>
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
