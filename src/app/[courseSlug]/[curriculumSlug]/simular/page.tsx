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
import { GripHorizontal, HelpCircle } from 'lucide-react'
import { TOUR_STEPS, TutorialOverlay } from './components/tutorial-overlay'
import {
  getTutorialShown,
  setTutorialShown,
} from '@/storage/local-storage/tutorial'
import Link from 'next/link'

export default function SimulationPage({
  params,
}: {
  params: Promise<{
    courseSlug: string
    curriculumSlug: string
  }>
}) {
  const [wasTutorialShown, setWasTutorialShown] =
    useState<boolean>(getTutorialShown())
  const { courseSlug, curriculumSlug } = use(params)

  const [tourStep, setTourStep] = useState<number>(-1)

  const [expandedMode, setExpandedMode] = useState<
    'balanced' | 'subjects' | 'calendar'
  >('balanced')

  const { handleSelectCurriculum, selectedCourse, selectedCurriculum } =
    useCourse()

  const { currentSchedule, completedSubjects } = useSchedule()

  const { elementRef, downloadPNG } = useDownloadAsPNG()

  const firstSubjectElement = document.getElementById(
    'tour-subject-card',
  ) as HTMLDivElement

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

  const startTutorial = () => {
    setTourStep(0)
    setTutorialShown()
    setWasTutorialShown(true)

    if (firstSubjectElement) {
      firstSubjectElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
    }
  }

  const handleTourNext = () => {
    if (tourStep < TOUR_STEPS.length - 1) setTourStep((p) => p + 1)
  }

  const handleTourPrev = () => {
    if (tourStep > 0) setTourStep((p) => p - 1)
  }

  return (
    <main className="flex h-dvh w-full flex-col items-center justify-start overflow-hidden">
      <div className="flex h-full min-h-0 w-full flex-col gap-4 p-4 lg:p-6">
        {tourStep >= 0 && (
          <TutorialOverlay
            stepIndex={tourStep}
            onNext={handleTourNext}
            onPrev={handleTourPrev}
            onClose={() => setTourStep(-1)}
          />
        )}
        <header className="bg-accent/30 border-border/50 flex h-18 w-full shrink-0 items-center justify-between rounded-lg border px-3 py-4 sm:px-4">
          <Link href="/" aria-label="Home">
            <Logo className="h-10" isResponsive id="tour-return" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-emerald-300/50 bg-emerald-500/20 px-2 py-0.5 text-center font-medium text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
              <span className="text-xs">
                Concluídas: {completedSubjects.length}
              </span>
            </div>

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
        <article
          className="relative grid min-h-0 w-full flex-1 flex-col gap-0 transition-all data-[state=balanced]:grid-rows-[1fr_32px_1fr] data-[state=calendar]:grid-rows-[2.5fr_32px_1fr] data-[state=subjects]:grid-rows-[1fr_32px_2.5fr] md:grid-cols-[25rem_1fr] md:grid-rows-1! md:gap-4"
          data-state={expandedMode}
        >
          <SubjectsSidebar
            onDownloadSchedule={() =>
              downloadPNG(
                `${currentSchedule?.name} - ${new Date().toLocaleString()}`,
              )
            }
          />
          <div className="flex w-full items-center justify-center md:hidden">
            <button
              className="bg-accent/80 border-border hover:bg-accent/90 flex h-6 w-16 items-center justify-center rounded-full border transition-colors active:scale-95 md:h-8 md:w-20"
              onClick={toggleExpandedMode}
            >
              <GripHorizontal className="size-4" />
            </button>
          </div>
          <Calendar ref={elementRef} />
        </article>
      </div>
    </main>
  )
}
