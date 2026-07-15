'use client'

import { type ReactElement, useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useClass } from '@/contexts/class'

import NumberSelector from '../number-selector'
import YearSelector from '../year-selector'

type SelectSemesterDialogProps = {
  children?: ReactElement
  currentSemester?: number
  currentYear?: number
}

export default function SelectSemesterDialog({
  children,
  currentSemester,
  currentYear,
}: SelectSemesterDialogProps) {
  const [currentYearState, setCurrentYear] = useState(currentYear ?? null)
  const [currentSemesterState, setCurrentSemester] = useState(
    currentSemester ?? null,
  )

  const { changeSemester, changeYear } = useClass()

  const handleChangeSemester = useCallback(() => {
    if (currentYearState !== null && currentSemesterState !== null) {
      changeYear(currentYearState)
      changeSemester(currentSemesterState)
    }
  }, [currentYearState, currentSemesterState, changeYear, changeSemester])

  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent className="z-1000 flex flex-col gap-0 overflow-y-visible p-0 sm:max-w-md [&>button:last-child]:top-3.5">
        <DialogHeader className="space-y-0 text-left">
          <DialogTitle className="border-b px-6 py-4 text-base">
            Alterar Semestre
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Make changes to your profile here. You can change your photo and set a
          username.
        </DialogDescription>

        <div className="my-4 flex w-full items-center justify-center gap-4">
          <YearSelector
            startYear={2006}
            endYear={2026}
            initialYear={currentYear}
            onYearChange={(year) => {
              setCurrentYear(year)
            }}
          />
          <NumberSelector
            startNumber={1}
            endNumber={2}
            initialNumber={currentSemester}
            onNumberChange={(semester) => {
              setCurrentSemester(semester)
            }}
          />
        </div>

        <DialogFooter>
          <DialogClose
            render={(props) => (
              <Button type="button" variant="outline" {...props}>
                Cancelar
              </Button>
            )}
          />
          <DialogClose
            onClick={handleChangeSemester}
            render={(props) => (
              <Button type="button" {...props}>
                Alterar
              </Button>
            )}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
