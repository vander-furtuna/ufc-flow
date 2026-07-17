'use client'

import { useClass } from '@/contexts/class'
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
    currentYear,
    currentSemester,
    changeYear,
    changeSemester,
    isClassLoading,
  } = useClass()

  const semesterOptions = useMemo(() => {
    const currentYearNum = new Date().getFullYear()
    const startYear = 2022
    const endYear = currentYearNum
    const options: { value: string; label: string }[] = []

    for (let y = Math.max(endYear, 2026); y >= startYear; y--) {
      options.push({ value: `${y}-2`, label: `${y}.2` })
      options.push({ value: `${y}-1`, label: `${y}.1` })
    }
    return options
  }, [])

  const handleSemesterChange = (value: string) => {
    const [yearStr, semesterStr] = value.split('-')
    const year = parseInt(yearStr)
    const semester = parseInt(semesterStr)
    changeYear(year)
    changeSemester(semester)
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-1">
      <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        Semestre Letivo
      </span>
      <Select
        value={`${currentYear ?? 2026}-${currentSemester ?? 2}`}
        onValueChange={handleSemesterChange}
        disabled={isClassLoading}
      >
        <SelectTrigger className="bg-accent/40 border-border/70 h-9 w-full text-xs">
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
