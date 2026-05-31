'use client'

import { use, useEffect, useState } from 'react'
import { SubjectsSidebar } from './components/subjects-sidebar'
import { useCourse } from '@/contexts/course'
import { Calendar } from './components/calendar'
import { useSchedule } from '@/contexts/schedule'
import { useDownloadAsPNG } from '@/hooks/use-download-as-png'
import { TOUR_STEPS, TutorialOverlay } from './components/tutorial-overlay'
import {
  getTutorialShown,
  setTutorialShown,
} from '@/storage/local-storage/tutorial'

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

  const { handleSelectCurriculum, selectedCourse, selectedCurriculum } =
    useCourse()

  const { currentSchedule, completedSubjects } = useSchedule()

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

  const startTutorial = () => {
    setTourStep(0)
    setTutorialShown()
    setWasTutorialShown(true)

    const firstSubjectElement = document.getElementById(
      'tour-subject-card',
    ) as HTMLDivElement

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
      <div className="flex h-full min-h-0 w-full flex-col">
        {tourStep >= 0 && (
          <TutorialOverlay
            stepIndex={tourStep}
            onNext={handleTourNext}
            onPrev={handleTourPrev}
            onClose={() => setTourStep(-1)}
          />
        )}

        <article className="relative flex h-full min-h-0 w-full flex-1 flex-col gap-0 transition-all md:grid md:grid-cols-[25rem_1fr] md:grid-rows-1!">
          <SubjectsSidebar
            onDownloadSchedule={() =>
              downloadPNG(
                `${currentSchedule?.name} - ${new Date().toLocaleString()}`,
              )
            }
            startTutorial={startTutorial}
            wasTutorialShown={wasTutorialShown}
          />
          <div className="h-full min-w-0 flex-1 pb-18 md:p-4 md:pl-0">
            <Calendar ref={elementRef} />
          </div>
        </article>
      </div>
    </main>
  )
}
