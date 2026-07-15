'use client'

import { useCourse } from '@/contexts/course'
import { useSchedule } from '@/contexts/schedule'
import { useClass } from '@/contexts/class'
import type { Subject } from '@/types/course'
import { normalizeWords } from '@/utils/normalize-words'
import {
  ChevronUp,
  Download,
  HelpCircle,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type ComponentProps } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateScheduleDialog } from '../create-schedule-dialog'
import { DestructiveDialog } from '@/components/dialogs/destructive-dialog'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/theme-toggle'
import { SubjectItem } from './subject-item'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import { Line } from '@/components/title'

function SubjectsSearchBar({ className, ...props }: ComponentProps<'input'>) {
  return (
    <div
      className={cn(
        'bg-accent/70 border-border/50 hover:bg-accent/90 absolute bottom-6 left-1/2 z-400 flex h-12 w-[calc(100%-4rem)] -translate-x-1/2 items-center rounded-full border px-4 backdrop-blur-md',
        className,
      )}
    >
      <input
        type="text"
        className="h-full w-full bg-transparent text-sm outline-none"
        placeholder="Pesquisar por nome ou código..."
        {...props}
      />

      <Search className="text-foreground/70 size-5" />
    </div>
  )
}

export function SubjectsSidebar({
  onDownloadSchedule,
  startTutorial,
  wasTutorialShown,
}: {
  onDownloadSchedule?: () => void
  startTutorial?: () => void
  wasTutorialShown?: boolean
}) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [searchFilter, setSearchFilter] = useState('')
  const [isMobileMenuExpanded, setIsMobileMenuExpanded] = useState(false)

  const { currentSchedule, schedules, selectSchedule, deleteSchedule } =
    useSchedule()
  const { selectedCurriculum, selectedCourse } = useCourse()
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

  const handleSemesterChange = (value: string | null) => {
    if (!value) return
    const [yearStr, semesterStr] = value.split('-')
    const year = parseInt(yearStr)
    const semester = parseInt(semesterStr)
    changeYear(year)
    changeSemester(semester)
  }

  const subjectsBySemester = useMemo(() => {
    const grouped: Record<number, Subject[]> = {}

    const normalizedQueryLower = normalizeWords(searchFilter.toLowerCase())

    const subjects = selectedCurriculum?.subjects.filter((subject) => {
      const normalizedName = normalizeWords(subject.name.toLowerCase())
      const normalizedCode = normalizeWords(subject.code.toLowerCase())

      return (
        normalizedName.includes(normalizedQueryLower) ||
        normalizedCode.includes(normalizedQueryLower)
      )
    })

    subjects?.forEach((sub) => {
      if (!grouped[sub.semester]) grouped[sub.semester] = []
      grouped[sub.semester].push(sub)
    })
    return grouped
  }, [selectedCurriculum, searchFilter])

  return isMobile ? (
    <div className="absolute bottom-0 z-500 flex h-fit max-h-dvh w-full flex-col items-center justify-end transition-all">
      <div className="bg-card/70 flex w-full items-center gap-2 rounded-t-md border px-3 py-3 backdrop-blur-md">
        <Link href="/" aria-label="Home">
          <Logo className="h-9" iconOnly />
        </Link>
        {currentSchedule && schedules.length > 0 && (
          <div
            className="bg-accent border-border/70 hover:bg-accent/90 flex h-10 w-full items-center rounded-lg border p-0 px-2 transition-colors"
            id="tour-agenda-controls"
          >
            <div className="relative w-full">
              <Select
                value={currentSchedule?.id || ''}
                onValueChange={(value) =>
                  selectSchedule(schedules.find((s) => s.id === value)!)
                }
                items={schedules.map((s) => ({ value: s.id, label: s.name }))}
              >
                <SelectTrigger className="ring-none w-full border-0 bg-transparent px-1 py-2 text-sm outline-none focus:ring-0">
                  <SelectValue placeholder="Agenda" className="text-sm" />
                </SelectTrigger>
                <SelectContent className="z-900">
                  {schedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-foreground/20 mx-1 h-4 w-px"></div>

            <CreateScheduleDialog>
              <button className="hover:bg-foreground/10 text-foreground/90 rounded-md p-1.5 transition-all">
                <Plus className="size-4.5" />
              </button>
            </CreateScheduleDialog>
            <DestructiveDialog
              title="Excluir Agenda"
              description="Tem certeza que deseja excluir agenda? Essa ação é IRREVERSÍVEL!"
              confirmButtonText="Excluir"
              onConfirm={() => deleteSchedule(currentSchedule!.id)}
            >
              <button
                type="button"
                id="tour-agenda-delete"
                className="text-foreground/90 rounded-md p-1.5 transition-all hover:bg-red-600/10 hover:text-red-500 focus:bg-red-600/10 active:bg-red-600/20"
              >
                <Trash2 className="size-4.5" />
              </button>
            </DestructiveDialog>
            <button
              className="text-foreground/90 rounded-md p-1.5 transition-all hover:bg-purple-600/10 hover:text-purple-500 focus:bg-purple-600/10 active:bg-purple-600/20"
              onClick={() => onDownloadSchedule?.()}
              id="tour-agenda-download"
            >
              <Download className="size-4.5" />
            </button>
          </div>
        )}
        <button
          className="bg-accent text-foreground/90 hover:bg-accent/80 group/mobile-menu relative flex size-10 shrink-0 items-center justify-center rounded-full border transition-all"
          data-state={isMobileMenuExpanded ? 'expanded' : 'collapsed'}
          onClick={() => setIsMobileMenuExpanded(!isMobileMenuExpanded)}
        >
          <ChevronUp className="size-5 transition-all group-data-[state=expanded]/mobile-menu:rotate-180" />
        </button>
      </div>
      <div
        className="bg-background/70 relative flex h-0 w-full flex-col gap-4 overflow-y-auto py-0 backdrop-blur-md transition-all duration-300 data-[state=expanded]:h-[75dvh]"
        data-state={isMobileMenuExpanded ? 'expanded' : 'collapsed'}
      >
        <div className="no-scrollbar relative flex size-full flex-col gap-4 overflow-y-auto px-4 py-4 pb-20">
          {isClassLoading && (
            <div className="bg-background/60 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-xs">
              <div className="flex flex-col items-center gap-2">
                <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
                <span className="text-muted-foreground animate-pulse text-xs font-semibold">
                  Carregando turmas...
                </span>
              </div>
            </div>
          )}
          <h2 className="text-foreground/90 font-clash text-3xl font-semibold">
            {selectedCourse?.name}
          </h2>
          <div className="flex w-full shrink-0 flex-col gap-1">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Semestre Letivo
            </span>
            <Select
              value={`${currentYear ?? 2026}-${currentSemester ?? 2}`}
              onValueChange={handleSemesterChange}
              disabled={isClassLoading}
              items={semesterOptions}
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
          {(Object.entries(subjectsBySemester) as [string, Subject[]][]).map(
            ([sem, subjects]) => (
              <div key={sem} className="flex w-full flex-col gap-2">
                <div className="relative flex w-full items-center gap-1.5">
                  <h3 className="text-foreground/85 font-clash flex-1 text-lg font-semibold tracking-wider text-nowrap uppercase">
                    {sem}º Período
                  </h3>
                  <Line />
                </div>
                <div className="flex w-full flex-col gap-1.5">
                  {subjects.map((subject, index) => {
                    const colors = selectedCurriculum?.branchs
                      .filter((currentBranch) =>
                        subject.branch.includes(currentBranch.id),
                      )
                      .map((branch) => branch.color)

                    return (
                      <SubjectItem
                        subject={subject}
                        key={subject.code}
                        colors={colors || []}
                        index={index}
                      />
                    )
                  })}
                </div>
              </div>
            ),
          )}

          <SubjectsSearchBar
            className="fixed"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          <div className="to-background absolute bottom-0 left-1/2 z-600 h-12 w-full -translate-x-1/2 bg-linear-to-b from-transparent"></div>
        </div>
      </div>
    </div>
  ) : (
    <aside
      className="calendar-scrollbar relative hidden min-h-0 flex-1 shrink-0 flex-col overflow-y-auto px-6 pt-6 md:flex md:overflow-y-hidden"
      id="tour-subject-list"
    >
      <header className="flex w-full shrink-0 items-center justify-between">
        <Link href="/" aria-label="Home">
          <Logo className="h-10" isResponsive id="tour-return" />
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={startTutorial}
            className="relative"
          >
            {!wasTutorialShown && (
              <div className="absolute top-2 right-2 size-2 animate-pulse rounded-full bg-amber-500 dark:bg-yellow-400" />
            )}
            <HelpCircle className="text-muted-foreground size-5" />
          </Button>
          <ModeToggle />
        </div>
      </header>
      <div className="border-border/50 mt-8 flex w-full flex-col gap-3 border-b pb-3">
        <h2 className="text-foreground/90 font-clash text-3xl font-semibold">
          {selectedCourse?.name}
        </h2>
        <div className="flex w-full shrink-0 flex-col gap-1">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Semestre Letivo
          </span>
          <Select
            value={`${currentYear ?? 2026}-${currentSemester ?? 2}`}
            onValueChange={handleSemesterChange}
            disabled={isClassLoading}
            items={semesterOptions}
          >
            <SelectTrigger className="bg-accent/40 border-border/70 h-9 w-full text-xs">
              <SelectValue placeholder="Selecione o semestre" />
            </SelectTrigger>
            <SelectContent>
              {semesterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full flex-col gap-2">
          {currentSchedule && schedules.length > 0 && (
            <div
              className="bg-accent/80 border-border/70 hover:bg-accent/90 flex h-10 w-full items-center rounded-lg border p-0 px-2 transition-colors"
              id="tour-agenda-controls"
            >
              <div className="relative w-full">
                <Select
                  value={currentSchedule?.id || ''}
                  onValueChange={(value) =>
                    selectSchedule(schedules.find((s) => s.id === value)!)
                  }
                  items={schedules.map((s) => ({ value: s.id, label: s.name }))}
                >
                  <SelectTrigger className="ring-none w-full border-0 bg-transparent px-1 py-2 text-xs outline-none focus:ring-0">
                    <SelectValue placeholder="Agenda" className="text-xs" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-foreground/20 mx-1 h-4 w-px"></div>

              <CreateScheduleDialog>
                <button className="hover:bg-foreground/10 text-foreground/90 rounded-md p-1.5 transition-all">
                  <Plus className="size-4" />
                </button>
              </CreateScheduleDialog>
              <DestructiveDialog
                title="Excluir Agenda"
                description="Tem certeza que deseja excluir agenda? Essa ação é IRREVERSÍVEL!"
                confirmButtonText="Excluir"
                onConfirm={() => deleteSchedule(currentSchedule!.id)}
              >
                <button
                  type="button"
                  id="tour-agenda-delete"
                  className="text-foreground/90 rounded-md p-1.5 transition-all hover:bg-red-600/10 hover:text-red-500 focus:bg-red-600/10 active:bg-red-600/20"
                >
                  <Trash2 className="size-4" />
                </button>
              </DestructiveDialog>
              <button
                className="text-foreground/90 rounded-md p-1.5 transition-all hover:bg-purple-600/10 hover:text-purple-500 focus:bg-purple-600/10 active:bg-purple-600/20"
                onClick={() => onDownloadSchedule?.()}
                id="tour-agenda-download"
              >
                <Download className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="no-scrollbar relative flex h-full flex-col gap-4 pt-8 pb-20 md:overflow-y-auto">
        {isClassLoading && (
          <div className="bg-background/60 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-xs">
            <div className="flex flex-col items-center gap-2">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
              <span className="text-muted-foreground animate-pulse text-xs font-semibold">
                Carregando turmas...
              </span>
            </div>
          </div>
        )}
        {(Object.entries(subjectsBySemester) as [string, Subject[]][]).map(
          ([sem, subjects]) => (
            <div key={sem} className="flex w-full flex-col gap-2">
              <h3 className="text-foreground/85 font-clash text-lg font-semibold tracking-wider uppercase">
                {sem}º Período
              </h3>
              <div className="flex w-full flex-col gap-1.5">
                {subjects.map((subject, index) => {
                  const colors = selectedCurriculum?.branchs
                    .filter((currentBranch) =>
                      subject.branch.includes(currentBranch.id),
                    )
                    .map((branch) => branch.color)

                  return (
                    <SubjectItem
                      subject={subject}
                      key={subject.code}
                      colors={colors || []}
                      index={index}
                    />
                  )
                })}
              </div>
            </div>
          ),
        )}
      </div>
      <SubjectsSearchBar
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
      />
      <div className="to-background absolute bottom-0 left-1/2 z-300 h-12 w-full -translate-x-1/2 bg-linear-to-b from-transparent"></div>
    </aside>
  )
}
