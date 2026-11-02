'use client'

import { useCourse } from '@/contexts/course'
import { useClass } from '@/contexts/class'
import { CaretUpIcon, QuestionIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { UserMenu } from '@/components/user-menu'
import { useMediaQuery } from '@/hooks/use-media-query'
import { SubjectsSearchBar } from './subjects-search-bar'
import { SemesterSelector } from './semester-selector'
import { ScheduleControls } from './schedule-controls'
import { SubjectsList } from './subjects-list'
import { ScheduleSyncStatus } from '../schedule-sync-status'
import { ScheduleWarnings } from '../schedule-warnings'

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
  const [isMobileMenuExpanded, setIsMobileMenuExpanded] = useState(false)

  const { selectedCourse } = useCourse()
  const { isClassLoading } = useClass()

  return isMobile ? (
    <div className="absolute bottom-0 z-500 flex h-fit max-h-dvh w-full flex-col items-center justify-end transition-all">
      {!isMobileMenuExpanded && (
        <ScheduleWarnings className="max-h-[30dvh] w-full overflow-y-auto px-2 pb-2" />
      )}
      <div className="flex w-full flex-col gap-1.5 rounded-t-md border bg-card/70 px-3 py-3 backdrop-blur-md">
        <div className="flex w-full items-center gap-2">
          <Link href="/" aria-label="Home">
            <Logo className="h-9" iconOnly />
          </Link>
          <ScheduleControls onDownloadSchedule={onDownloadSchedule} isMobile />
          <button
            className="group/mobile-menu relative flex size-10 shrink-0 items-center justify-center rounded-full border bg-accent text-foreground/90 transition-all hover:bg-accent/80"
            data-state={isMobileMenuExpanded ? 'expanded' : 'collapsed'}
            onClick={() => setIsMobileMenuExpanded(!isMobileMenuExpanded)}
          >
            <CaretUpIcon
              weight="bold"
              className="size-5 transition-all group-data-[state=expanded]/mobile-menu:rotate-180"
            />
          </button>
        </div>
        <ScheduleSyncStatus />
      </div>
      <div
        className="relative flex h-0 w-full flex-col gap-4 overflow-y-auto bg-background/70 py-0 backdrop-blur-md transition-all duration-300 data-[state=expanded]:h-[75dvh]"
        data-state={isMobileMenuExpanded ? 'expanded' : 'collapsed'}
      >
        <div className="relative flex size-full no-scrollbar flex-col gap-4 overflow-y-auto px-4 py-4 pb-20">
          {isClassLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-xs">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="animate-pulse text-xs font-semibold text-muted-foreground">
                  Carregando turmas...
                </span>
              </div>
            </div>
          )}
          <h2 className="font-clash text-3xl font-semibold text-foreground/90">
            {selectedCourse?.name}
          </h2>
          <SemesterSelector />
          <SubjectsList showLine />
          <SubjectsSearchBar className="fixed" />
          <div className="fixed bottom-0 left-1/2 z-400 h-12 w-full -translate-x-1/2 bg-linear-to-b from-transparent to-background"></div>
        </div>
      </div>
    </div>
  ) : (
    <aside
      className="relative hidden calendar-scrollbar min-h-0 flex-1 shrink-0 flex-col overflow-y-auto px-6 pt-6 md:flex md:overflow-y-hidden"
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
            <QuestionIcon
              weight="bold"
              className="size-5 text-muted-foreground"
            />
          </Button>
          <ModeToggle />
          <NotificationBell align="start" />
          <UserMenu />
        </div>
      </header>
      <div className="mt-8 flex w-full flex-col gap-3 border-b border-border/50 pb-3">
        <h2 className="font-clash text-3xl font-semibold text-foreground/90">
          {selectedCourse?.name}
        </h2>
        <SemesterSelector />

        <div className="flex w-full flex-col gap-2">
          <ScheduleControls onDownloadSchedule={onDownloadSchedule} />
          <ScheduleSyncStatus />
          <ScheduleWarnings />
        </div>
      </div>
      <div className="relative flex h-full no-scrollbar flex-col gap-4 pb-20 md:overflow-y-auto">
        {isClassLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-xs">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="animate-pulse text-xs font-semibold text-muted-foreground">
                Carregando turmas...
              </span>
            </div>
          </div>
        )}
        <SubjectsList />
      </div>
      <SubjectsSearchBar />
      <div className="absolute bottom-0 left-1/2 z-300 h-12 w-full -translate-x-1/2 bg-linear-to-b from-transparent to-background"></div>
    </aside>
  )
}
