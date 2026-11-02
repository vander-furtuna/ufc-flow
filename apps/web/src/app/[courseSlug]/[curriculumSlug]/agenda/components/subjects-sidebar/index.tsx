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
import { ScheduleSummary } from '../schedule-summary'

function ClassesLoading() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-xs">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span className="animate-pulse text-xs font-semibold text-muted-foreground">
          Carregando turmas...
        </span>
      </div>
    </div>
  )
}

// Barra lateral da agenda (mockups Agenda-Notificacoes e Mobile-Agenda). A
// lista de disciplinas do curso continua abaixo do resumo: é por ela que as
// turmas entram na agenda.
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
        <ScheduleWarnings
          compact
          onOpen={() => setIsMobileMenuExpanded(true)}
          className="mb-3 w-[calc(100%-24px)]"
        />
      )}
      <div
        className="flex w-[calc(100%-16px)] flex-col gap-2 rounded-[22px] border bg-muted/85 p-2.5 shadow-lg backdrop-blur-md data-[state=collapsed]:mb-5"
        data-state={isMobileMenuExpanded ? 'expanded' : 'collapsed'}
      >
        <div className="flex w-full items-center gap-2">
          <Link href="/" aria-label="UFC Flow, ir para o início">
            <Logo className="size-9" iconOnly />
          </Link>
          <ScheduleControls onDownloadSchedule={onDownloadSchedule} isMobile />
          <button
            type="button"
            aria-label={
              isMobileMenuExpanded
                ? 'Fechar lista de disciplinas'
                : 'Abrir lista de disciplinas'
            }
            aria-expanded={isMobileMenuExpanded}
            className="group/mobile-menu relative flex size-11 shrink-0 items-center justify-center rounded-full border bg-background text-foreground/90 transition-all hover:bg-muted"
            data-state={isMobileMenuExpanded ? 'expanded' : 'collapsed'}
            onClick={() => setIsMobileMenuExpanded(!isMobileMenuExpanded)}
          >
            <CaretUpIcon
              weight="bold"
              className="size-5 transition-all group-data-[state=expanded]/mobile-menu:rotate-180"
            />
          </button>
        </div>
        <ScheduleSyncStatus compact className="pl-1" />
      </div>
      <div
        className="relative flex h-0 w-full flex-col gap-4 overflow-y-auto bg-background/70 py-0 backdrop-blur-md transition-all duration-300 data-[state=expanded]:h-[75dvh]"
        data-state={isMobileMenuExpanded ? 'expanded' : 'collapsed'}
      >
        <div className="relative flex size-full no-scrollbar flex-col gap-4 overflow-y-auto px-4 py-4 pb-20">
          {isClassLoading && <ClassesLoading />}
          <h1 className="font-clash text-2xl font-semibold">
            {selectedCourse?.name}
          </h1>
          <SemesterSelector />
          <ScheduleWarnings />
          <ScheduleSummary />
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
        <Link href="/" aria-label="UFC Flow, ir para o início">
          <Logo className="h-10" isResponsive id="tour-return" />
        </Link>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={startTutorial}
            className="relative"
            aria-label="Como usar a agenda"
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
      <div className="mt-6 flex w-full shrink-0 flex-col gap-4 border-b border-border/50 pb-4">
        <h1 className="font-clash text-[28px] leading-[34px] font-semibold">
          {selectedCourse?.name}
        </h1>
        <SemesterSelector />
        <div className="flex w-full flex-col gap-2">
          <ScheduleControls onDownloadSchedule={onDownloadSchedule} />
          <ScheduleSyncStatus />
        </div>
      </div>
      <div className="relative flex h-full no-scrollbar flex-col gap-4 pt-4 pb-20 md:overflow-y-auto">
        {isClassLoading && <ClassesLoading />}
        <ScheduleWarnings />
        <ScheduleSummary />
        <SubjectsList />
      </div>
      <SubjectsSearchBar />
      <div className="absolute bottom-0 left-1/2 z-300 h-12 w-full -translate-x-1/2 bg-linear-to-b from-transparent to-background"></div>
    </aside>
  )
}
