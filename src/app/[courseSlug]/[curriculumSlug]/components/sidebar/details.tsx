'use client'

import { ChevronDown, Loader2, RefreshCcw, User } from 'lucide-react'
import { useMemo } from 'react'

import SelectSemesterDialog from '@/components/dialogs/select-semester-dialog'
import { useClass } from '@/contexts/class'
import type { ScheduleTime } from '@/types/class'

import { SectionTitle } from './section-title'
import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'
import { capitalizeWords } from '@/utils/capitalize-words'

type DetailsProps = {
  code: string
}

function SchedulePill({ time }: { time: ScheduleTime }) {
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
      <span className="text-foreground/80 text-xs uppercase">Horário:</span>

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

  return (
    <div className="relative z-20 mt-8 flex flex-col gap-2">
      <SectionTitle>Detalhes</SectionTitle>
      <div className="flex flex-wrap items-center justify-center gap-2 px-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-xs uppercase">Semestre:</span>
          <div className="flex items-center gap-1">
            <SelectSemesterDialog
              currentSemester={currentSemester ?? undefined}
              currentYear={currentYear ?? undefined}
            >
              <button
                className="bg-accent/50 border-border hover:bg-accent/80 flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors disabled:opacity-70"
                disabled={isClassLoading}
              >
                <span className="text-sm leading-tight font-medium">{`${currentYear}.${currentSemester}`}</span>
                {isClassLoading ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={3} />
                ) : (
                  <ChevronDown className="size-4" strokeWidth={3} />
                )}
              </button>
            </SelectSemesterDialog>

            <button
              className="bg-accent/50 border-border flex items-center gap-1 rounded-full border px-2.5 py-1 disabled:opacity-70"
              disabled={isClassLoading}
              onClick={handleRefreshSubjectInformations}
            >
              <RefreshCcw className="size-4" />
            </button>
          </div>
        </div>

        {subjectInfo ? (
          <div className="flex w-full flex-col items-center justify-between gap-3">
            {subjectInfo.classes.map((classItem) => (
              <div
                key={classItem.id}
                className="border-border flex w-full flex-col gap-1.5 border-t pt-2"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-bold">
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
                        <span className="text-accent-foreground/80 text-xs uppercase">
                          {classItem.instructors.length > 1
                            ? 'Professores:'
                            : 'Professor(a):'}
                        </span>
                        {classItem.instructors.map((instructor) => (
                          <span
                            className="text-sm font-medium"
                            key={instructor.siape}
                          >
                            {capitalizeWords(instructor.name)}
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
