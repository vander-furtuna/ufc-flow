'use client'

import { useClass } from '@/contexts/class'
import { selectableTerms } from '@/utils/academic-term'
import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SemesterSelector() {
  const {
    officialTerm,
    currentYear,
    currentSemester,
    changeYear,
    changeSemester,
    isClassLoading,
  } = useClass()

  // Até o semestre seguinte ao corrente (que já tem as disciplinas)
  const semesterOptions = useMemo(
    () =>
      selectableTerms(officialTerm).map(({ year, semester }) => ({
        value: `${year}-${semester}`,
        label: `${year}.${semester}`,
      })),
    [officialTerm],
  )

  const handleSemesterChange = (value: string) => {
    const [yearStr, semesterStr] = value.split('-')
    const year = parseInt(yearStr)
    const semester = parseInt(semesterStr)
    changeYear(year)
    changeSemester(semester)
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
        Semestre letivo
      </span>
      <Select
        value={`${currentYear ?? 2026}-${currentSemester ?? 2}`}
        onValueChange={handleSemesterChange}
        disabled={isClassLoading}
      >
        <SelectTrigger
          aria-label="Semestre letivo"
          className="h-11 w-full rounded-[14px] bg-muted/50 text-sm"
        >
          <SelectValue placeholder="Selecione o semestre" />
        </SelectTrigger>
        <SelectContent className="z-900">
          {semesterOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
