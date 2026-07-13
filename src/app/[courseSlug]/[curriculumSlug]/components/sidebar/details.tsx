'use client'

import { ChevronsUpDown, RefreshCcw, User } from 'lucide-react'
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
      className="bg-accent/50 border-border flex h-7 w-fit shrink-0 items-center gap-1 rounded-full border px-2"
    >
      <span className="text-xs font-semibold">{time.day}</span>

      <span className="text-foreground/95 text-xs font-normal">
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
      <span className="text-foreground/80 text-xs">Horário:</span>

      <div
        className="no-scrollbar relative flex w-full gap-1 overflow-x-auto text-sm font-semibold"
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
              className="bg-accent/50 border-border/50 hover:bg-accent/80 flex items-center gap-1 rounded-l-full border py-1 pr-1.5 pl-2.5 transition-colors disabled:opacity-70"
              disabled={isClassLoading}
            >
              <span className="text-sm leading-tight font-medium">{`${currentYear}.${currentSemester}`}</span>

              <ChevronsUpDown
                className="text-foreground/70 size-3.5"
                strokeWidth={2}
              />
            </button>
          </SelectSemesterDialog>

          <button
            className="bg-accent/50 border-border/50 hover:bg-accent/80 flex items-center gap-1 rounded-r-full border py-1 pr-2 pl-1.5 disabled:opacity-70"
            disabled={isClassLoading}
            onClick={handleRefreshSubjectInformations}
          >
            <RefreshCcw
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
                className="dark:bg-background/15 bg-background/70 border-border border-border/50 flex w-full flex-col gap-1.5 rounded-md border p-3"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-foreground/90 font-clash text-sm font-semibold uppercase">
                    Turma {classItem.sectionId}
                  </strong>

                  <div className="flex items-center gap-0.5">
                    <User className="text-muted-foreground inline size-4" />
                    <span className="text-accent-foreground/80 text-xs font-medium">
                      {classItem.reservedSeats}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-start justify-between gap-0.5">
                  {classItem.instructors &&
                    classItem.instructors.length > 0 && (
                      <>
                        <span className="text-accent-foreground/80 text-xs">
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
            <span className="text-muted-foreground text-center text-sm font-medium">
              Nenhuma turma encontrada para esta disciplina em {currentYear}.
              {currentSemester}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
