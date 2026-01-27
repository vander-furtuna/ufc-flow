'use client'

import { use, useEffect, useState } from 'react'
import { SubjectsSidebar } from './components/subjects-sidebar'
import { useCourse } from '@/contexts/course'
import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/theme-toggle'
import { Calendar } from './components/calendar'
import { useSchedule } from '@/contexts/schedule'
import { useDownloadAsPNG } from '@/hooks/use-download-as-png'
import { Button } from '@/components/ui/button'
import { ArrowUpDown } from 'lucide-react'

export default function SimulationPage({
  params,
}: {
  params: Promise<{
    courseSlug: string
    curriculumSlug: string
  }>
}) {
  const { courseSlug, curriculumSlug } = use(params)

  const [expandedMode, setExpandedMode] = useState<
    'balanced' | 'subjects' | 'calendar'
  >('balanced')

  const { handleSelectCurriculum, selectedCourse, selectedCurriculum } =
    useCourse()

  const { currentSchedule, completedSubjects, scheduleClasses } = useSchedule()

  const { elementRef, downloadPNG } = useDownloadAsPNG()

  useEffect(() => {
    if (!selectedCurriculum && !selectedCourse) {
      handleSelectCurriculum({
        curriculumSlug,
        courseSlug,
      })
    }
  }, [
    handleSelectCurriculum,
    selectedCourse,
    selectedCurriculum,
    curriculumSlug,
    courseSlug,
  ])

  const toggleExpandedMode = () => {
    setExpandedMode((prevMode) => {
      if (prevMode === 'balanced') return 'calendar'
      if (prevMode === 'calendar') return 'subjects'
      return 'balanced'
    })
  }

  return (
    <main className="flex h-dvh w-full flex-col items-center justify-start overflow-hidden">
      <div className="flex h-full min-h-0 w-full flex-col gap-4 p-4 lg:p-6">
        <header className="bg-accent/30 border-border/50 flex h-18 w-full shrink-0 items-center justify-between rounded-lg border px-3 py-4 sm:px-4">
          <Logo className="h-full" isResponsive />
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-emerald-300/50 bg-emerald-500/20 px-2 py-0.5 text-center font-medium text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
              <span className="text-xs">
                Concluídas: {completedSubjects.length}
              </span>
            </div>

            <Button variant="ghost" size="icon" className="flex md:hidden">
              <ArrowUpDown
                className="text-muted-foreground size-5"
                onClick={toggleExpandedMode}
              />
            </Button>
            <ModeToggle />
          </div>
        </header>
        <article
          className="relative grid min-h-0 w-full flex-1 flex-col gap-8 transition-all data-[state=balanced]:grid-rows-[1fr_1fr] data-[state=calendar]:grid-rows-[2.5fr_1fr] data-[state=subjects]:grid-rows-[1fr_2.5fr] md:grid-cols-[25rem_1fr] md:grid-rows-1! md:gap-4"
          data-state={expandedMode}
        >
          <SubjectsSidebar
            onDownloadSchedule={() =>
              downloadPNG(
                `${currentSchedule?.name} - ${new Date().toLocaleString()}`,
              )
            }
          />
          <Calendar ref={elementRef} />
        </article>
      </div>
    </main>
  )
}
