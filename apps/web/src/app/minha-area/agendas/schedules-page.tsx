'use client'

import { CalendarCheckIcon, CaretRightIcon } from '@phosphor-icons/react'
import type { ScheduleView } from '@ufc-flow/contracts'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { AcademicShell } from '@/components/academic/academic-shell'
import { FlowLoading } from '@/components/flow-loading'
import { useCourse } from '@/contexts/course'
import { useSession } from '@/lib/auth/use-session'
import { listSchedulesAction } from '@/lib/planning/schedule-actions'

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

// Agendas sincronizadas da conta, por semestre (a mais nova primeiro)
export function SchedulesPage() {
  const { data: user } = useSession()
  const { courses } = useCourse()
  const { data, isPending, error } = useQuery({
    queryKey: ['planning', 'schedules', 'all'],
    queryFn: async () => {
      const result = await listSchedulesAction({})
      if (!result.ok) throw new Error(result.problem.detail)
      return result.data
    },
    enabled: Boolean(user),
  })
  const courseName = (slug: string) =>
    courses.find((course) => course.slug === slug)?.name ?? slug
  const terms = [...new Set((data ?? []).map((item) => item.term))].sort(
    (a, b) => b.localeCompare(a),
  )

  return (
    <AcademicShell eyebrow="Minha área" title="Agendas">
      {isPending ? (
        <FlowLoading
          className="mx-auto mt-16 size-16"
          aria-label="Carregando"
        />
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : terms.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">
          <p>
            Nenhuma agenda na conta ainda. Monte uma em Simular Agenda: com a
            conta, ela fica salva em todos os seus aparelhos.
          </p>
          <Link
            href="/cursos"
            className="font-medium text-foreground underline"
          >
            Escolher o curso
          </Link>
        </div>
      ) : (
        terms.map((term) => (
          <section
            key={term}
            aria-labelledby={`agendas-${term}`}
            className="flex flex-col gap-3"
          >
            <h2
              id={`agendas-${term}`}
              className="font-clash text-xl font-semibold"
            >
              {term}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {data!
                .filter((schedule) => schedule.term === term)
                .map((schedule: ScheduleView) => (
                  <li key={schedule.id}>
                    <Link
                      href={`/${schedule.courseSlug}/${schedule.curriculumSlug}/agenda`}
                      className="flex items-center gap-4 rounded-3xl border bg-card p-4 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
                        <CalendarCheckIcon weight="bold" className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold">
                          {schedule.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {courseName(schedule.courseSlug)} · EC{' '}
                          {schedule.curriculumSlug.replace('-', '.')} ·{' '}
                          {plural(schedule.items.length, 'turma', 'turmas')}
                        </span>
                      </span>
                      <CaretRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </AcademicShell>
  )
}
