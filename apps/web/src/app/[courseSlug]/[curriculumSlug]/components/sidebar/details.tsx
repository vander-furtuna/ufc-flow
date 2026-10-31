'use client'

import {
  ArrowCounterClockwiseIcon,
  CaretUpDownIcon,
  UserIcon,
} from '@phosphor-icons/react'
import { useMemo } from 'react'

import SelectSemesterDialog from '@/components/dialogs/select-semester-dialog'
import { useClass } from '@/contexts/class'
import type { ScheduleTime } from '@/types/class'

import { SectionTitle } from './section-title'
import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'
import { capitalizeWords } from '@/utils/capitalize-words'
import { cn } from '@/lib/utils'

type DetailsProps = {
  code: string
}

export function SchedulePill({ time }: { time: ScheduleTime }) {
  return (
    <div
      key={time.id}
      className="flex h-7 w-fit shrink-0 items-center gap-1 rounded-full border border-border bg-accent/50 px-2"
    >
      <span className="text-xs font-semibold">{time.day}</span>

      <span className="text-xs font-normal text-foreground/95">
        {`${time.startTime}-${time.endTime}`}
      </span>
    </div>
  )
}

function ScheduleSection({ times }: { times: ScheduleTime[] }) {
  const { scrollRef, showLeftShadow, showRightShadow } =
    useHorizontalScrollWithOverlay<HTMLDivElement>()

  const maskImage = useMemo(() => {
    return `linear-gradient(to right, rgba(0, 0, 0, 0) ${showLeftShadow ? '2%' : '0%'}, rgba(0, 0, 0, 1) ${showLeftShadow ? '10%' : '0%'}, rgba(0, 0, 0, 1) ${showRightShadow ? '90%' : '100%'}, rgba(0, 0, 0, 0)  ${showRightShadow ? '98%' : '100%'})`
  }, [showLeftShadow, showRightShadow])

  return (
    <div className="flex w-full flex-col items-start justify-between gap-1">
      <span className="text-xs text-foreground/80">Horário:</span>

      <div
        className="relative flex w-full no-scrollbar gap-1 overflow-x-auto text-sm font-semibold"
        ref={scrollRef}
        style={{ maskImage }}
      >
        {times.map((time) => (
          <SchedulePill time={time} key={time.id} />
        ))}
      </div>
    </div>
  )
}

export function Details({ code }: DetailsProps) {
  const {
    currentYear,
    currentSemester,
    getSubjectInformationByCode,
    isClassLoading,
    handleRefreshSubjectInformations,
  } = useClass()

  const subjectInfo = useMemo(() => {
    return code ? getSubjectInformationByCode(code) : null
  }, [code, getSubjectInformationByCode])

  console.log(subjectInfo?.classes)

  return (
    <div className="relative z-20 mt-4 flex flex-col gap-2">
      <div className="flex w-full items-center gap-3 px-4">
        <SectionTitle side="left" className="w-full gap-3">
          Turmas
        </SectionTitle>

        <div className="flex items-center gap-0.5">
          <SelectSemesterDialog
            currentSemester={currentSemester ?? undefined}
            currentYear={currentYear ?? undefined}
          >
            <button
              className="flex items-center gap-1 rounded-l-full border border-border/50 bg-accent/50 py-1 pr-1.5 pl-2.5 transition-colors hover:bg-accent/80 disabled:opacity-70"
              disabled={isClassLoading}
            >
              <span className="text-sm leading-tight font-medium">{`${currentYear}.${currentSemester}`}</span>

              <CaretUpDownIcon
                weight="bold"
                className="size-3.5 text-foreground/70"
              />
            </button>
          </SelectSemesterDialog>

          <button
            className="flex items-center gap-1 rounded-r-full border border-border/50 bg-accent/50 py-1 pr-2 pl-1.5 hover:bg-accent/80 disabled:opacity-70"
            disabled={isClassLoading}
            onClick={handleRefreshSubjectInformations}
          >
            <ArrowCounterClockwiseIcon
              weight="bold"
              className={cn('size-4', isClassLoading && 'animate-spin')}
            />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 px-3">
        {subjectInfo ? (
          <div className="flex w-full flex-col items-center justify-between gap-1">
            {subjectInfo.classes.map((classItem) => (
              <div
                key={classItem.id}
                className="flex w-full flex-col gap-1.5 rounded-md border border-border border-border/50 bg-background/70 p-3 dark:bg-background/15"
              >
                <div className="flex items-center justify-between">
                  <strong className="font-clash text-sm font-semibold text-foreground/90 uppercase">
                    Turma {classItem.sectionId}
                  </strong>

                  <div className="flex items-center gap-0.5">
                    <UserIcon
                      weight="bold"
                      className="inline size-4 text-muted-foreground"
                    />
                    <span className="text-xs font-medium text-accent-foreground/80">
                      {classItem.reservedSeats}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-start justify-between gap-0.5">
                  {classItem.instructors &&
                    classItem.instructors.length > 0 && (
                      <>
                        <span className="text-xs text-accent-foreground/80">
                          {classItem.instructors.length > 1
                            ? 'Professores:'
                            : 'Professor(a):'}
                        </span>
                        {classItem.instructors.map((instructor) => (
                          <span
                            className="text-sm font-medium"
                            key={instructor.siape}
                          >
                            {instructor?.name
                              ? capitalizeWords(instructor.name)
                              : 'Não informado(a)'}
                          </span>
                        ))}
                      </>
                    )}
                </div>
                <ScheduleSection times={classItem.schedule} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-2">
            <span className="text-center text-sm font-medium text-muted-foreground">
              Nenhuma turma encontrada para esta disciplina em {currentYear}.
              {currentSemester}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
