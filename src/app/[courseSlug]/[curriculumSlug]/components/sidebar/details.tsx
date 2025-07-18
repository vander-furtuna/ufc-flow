'use client'

import { ChevronDown, Loader2, RefreshCcw, User } from 'lucide-react'
import { useEffect, useState } from 'react'

import SelectSemesterDialog from '@/components/dialogs/select-semester-dialog'
import { useClass } from '@/contexts/class'
import { useHorizontalScroll } from '@/hooks/use-horizontal-scroll'
import type { ScheduleTime, SubjectGroup } from '@/types/class'

import { SectionTitle } from './section-title'

type DetailsProps = {
  code: string
}

function SchedulePill({ time }: { time: ScheduleTime }) {
  return (
    <div
      key={time.id}
      className="bg-accent/50 border-border flex h-7 w-fit shrink-0 items-center gap-1 rounded-full border px-2"
    >
      <span className="text-xs font-bold">{time.day}</span>
      <span className="text-xs font-semibold">
        {`${time.startTime}-${time.endTime}`}
      </span>
    </div>
  )
}

function ScheduleSection({ times }: { times: ScheduleTime[] }) {
  const scrollRef = useHorizontalScroll()

  // Estados para controlar a visibilidade das sombras de gradiente
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    // Função para verificar a posição do scroll e atualizar a visibilidade das sombras
    const checkScroll = () => {
      // Verifica se o conteúdo realmente ultrapassa a área visível
      const hasHorizontalOverflow = element.scrollWidth > element.clientWidth

      if (hasHorizontalOverflow) {
        // Mostra a sombra esquerda se o scroll não estiver no início
        setShowLeftShadow(element.scrollLeft > 0)

        // Mostra a sombra direita se o scroll não estiver no final.
        // Usamos uma pequena tolerância (1px) para evitar problemas de arredondamento.
        const isAtEnd =
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 1
        setShowRightShadow(!isAtEnd)
      } else {
        // Se não houver overflow, esconde ambas as sombras
        setShowLeftShadow(false)
        setShowRightShadow(false)
      }
    }

    // Verifica o estado inicial assim que o componente é montado e sempre que os 'times' mudam
    checkScroll()

    // Adiciona um ouvinte para o evento de scroll no elemento
    element.addEventListener('scroll', checkScroll)

    // Usa um ResizeObserver para re-verificar caso o tamanho do container mude (ex: rotação da tela)
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(element)

    // Função de limpeza para remover os ouvintes quando o componente for desmontado
    return () => {
      element.removeEventListener('scroll', checkScroll)
      resizeObserver.unobserve(element)
    }
  }, [times, scrollRef]) // A dependência 'times' garante que a verificação seja refeita se os itens mudarem

  return (
    <div className="flex w-full flex-col items-start justify-between gap-1">
      <span className="text-xs uppercase">Horário:</span>

      <div
        className="no-scrollbar relative flex w-full gap-1 overflow-x-auto text-sm font-semibold"
        ref={scrollRef}
      >
        {times.map((time) => (
          <SchedulePill time={time} key={time.id} />
        ))}

        {/* Sombra da Esquerda */}
        <div
          aria-hidden="true"
          data-state={showLeftShadow ? 'visible' : 'hidden'}
          className="pointer-events-none fixed left-4 h-7 w-16 bg-gradient-to-r from-slate-100/50 to-transparent transition-opacity duration-300 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100 dark:from-slate-900/50"
        />

        {/* Sombra da Direita */}
        <div
          aria-hidden="true"
          data-state={showRightShadow ? 'visible' : 'hidden'}
          className="pointer-events-none fixed right-4 h-7 w-16 bg-gradient-to-l from-slate-100/50 to-transparent transition-opacity duration-300 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100 dark:from-slate-900/50"
        />
      </div>
    </div>
  )
}

export function Details({ code }: DetailsProps) {
  const [subjectInfo, setSubjectInfo] = useState<SubjectGroup | null>(null)
  const {
    currentYear,
    currentSemester,
    getSubjectInformationByCode,
    isClassLoading,
    handleRefreshSubjectInformations,
  } = useClass()

  useEffect(() => {
    if (code) {
      const data = getSubjectInformationByCode(code)

      setSubjectInfo(data)
    }
  }, [code, getSubjectInformationByCode])

  return (
    <div className="relative z-20 mt-8 flex flex-col gap-2 px-2">
      <SectionTitle>Detalhes</SectionTitle>
      <div className="flex flex-wrap items-center justify-center gap-2 px-2">
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
                  {classItem.instructor.name && (
                    <>
                      <span className="text-accent-foreground/90 text-xs uppercase">
                        Professor:
                      </span>
                      <span className="text-sm font-medium">
                        {classItem.instructor.name}
                      </span>
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
