'use client'

import {
  ClockIcon,
  HourglassMediumIcon,
  MapPinIcon,
} from '@phosphor-icons/react'
import type {
  AcademicSummary,
  EnrollmentView,
  ProgressView,
  SubjectRecordView,
} from '@ufc-flow/contracts'
import Link from 'next/link'
import { useState } from 'react'

import { AcademicShell, Panel } from '@/components/academic/academic-shell'
import { CloseSituationDialog } from '@/components/academic/close-situation-dialog'
import {
  ChangeCurriculumDialog,
  ManageEnrollmentsDialog,
} from '@/components/academic/enrollment-dialogs'
import { FirstEnrollment } from '@/components/academic/first-enrollment'
import { CourseDynamicIcon } from '@/components/course-dynamic-icon'
import { FlowLoading } from '@/components/flow-loading'
import { Button } from '@/components/ui/button'
import { useCourse } from '@/contexts/course'
import { COLORS } from '@/data/colors'
import { RECORD_NATURE_COLORS } from '@/data/status-colors'
import {
  dayMonth,
  formatHours,
  periodsLeft,
} from '@/lib/academic-record/history'
import {
  useAcademicSummary,
  useCurrentEnrollment,
} from '@/lib/academic-record/use-academic'
import { useSession } from '@/lib/auth/use-session'
import { cn } from '@/lib/utils'
import { titleCase } from '@/utils/title-case'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

const ratio = (done: number, required: number) =>
  required <= 0 ? 1 : Math.min(1, done / required)

function Bar({ value, color }: { value: number; color: string }) {
  return (
    // Decorativa: os números ficam no texto ao lado
    <div
      aria-hidden
      className="h-2 w-full overflow-hidden rounded-full bg-foreground/10"
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{
          width: `${value * 100}%`,
          background: `linear-gradient(90deg, color-mix(in oklab, ${color} 70%, white), ${color})`,
        }}
      />
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-xs font-medium">
      {children}
    </span>
  )
}

function Ring({ value }: { value: number }) {
  const radius = 42
  const length = 2 * Math.PI * radius
  return (
    <div className="relative size-28 shrink-0 sm:size-36">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          className="stroke-foreground/10"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke={COLORS.COMPULSORY}
          strokeDasharray={`${length * value} ${length}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-clash text-2xl font-semibold sm:text-3xl">
        {Math.floor(value * 100)}%
      </span>
    </div>
  )
}

function CategoryRow({
  label,
  completed,
  required,
  color,
  note,
}: {
  label: string
  completed: number
  required: number
  color: string
  note?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          <b className="font-semibold text-foreground">
            {formatHours(completed)}
          </b>{' '}
          / {formatHours(required)} h
        </span>
      </div>
      <Bar value={ratio(completed, required)} color={color} />
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  )
}

function Categories({
  progress,
  maxFreeHours,
}: {
  progress: ProgressView
  maxFreeHours: number | undefined
}) {
  const { optative, complementary, extension } = progress
  const freeNote =
    optative.freeHours > 0
      ? `Inclui ${formatHours(optative.freeHours)} h de optativa livre${
          maxFreeHours ? ` (limite da EC: ${formatHours(maxFreeHours)} h)` : ''
        }${
          optative.freeHoursOverCap > 0
            ? `; ${formatHours(optative.freeHoursOverCap)} h acima do limite não contam`
            : ''
        }`
      : undefined
  return (
    <Panel title="Por categoria" aria-label="Progresso por categoria">
      <CategoryRow
        label="Obrigatórias"
        completed={progress.mandatory.completedHours}
        required={progress.mandatory.requiredHours}
        color={COLORS.COMPULSORY}
      />
      <CategoryRow
        label="Optativas"
        completed={optative.completedHours}
        required={optative.requiredHours}
        color={COLORS.OPTIONAL}
        note={freeNote}
      />
      {complementary.requiredHours > 0 && (
        <CategoryRow
          label="Atividades complementares"
          completed={complementary.completedHours}
          required={complementary.requiredHours}
          color={COLORS.COMPLEMENTARY_ACTIVITY}
          note={
            complementary.componentCompleted
              ? 'Componente integralizado pela coordenação'
              : undefined
          }
        />
      )}
      {extension.requiredHours > 0 ? (
        <CategoryRow
          label="Extensão"
          completed={extension.completedHours}
          required={extension.requiredHours}
          color={COLORS.EXTENSION}
        />
      ) : (
        <div className="flex justify-between gap-2 border-t pt-4 text-sm">
          <span>Extensão</span>
          <span className="text-muted-foreground">Não exigida nesta EC</span>
        </div>
      )}
    </Panel>
  )
}

function branchProgress(branch: ProgressView['branches'][number]) {
  if (branch.minHours) {
    return {
      value: ratio(branch.completedHours, branch.minHours),
      text: `${formatHours(branch.completedHours)} de ${formatHours(branch.minHours)} h`,
    }
  }
  const total = branch.minComponents ?? branch.totalComponents
  return {
    value: ratio(branch.completedComponents, total),
    text: `${branch.completedComponents} de ${total} componentes`,
  }
}

function Branches({ progress }: { progress: ProgressView }) {
  const branches = progress.branches.filter((branch) => !branch.parentId)
  if (branches.length === 0) return null
  const { emphases } = progress
  const hasEmphases = branches.some((branch) => branch.type === 'EMPHASIS')
  const rule =
    hasEmphases && emphases.required
      ? `${emphases.completed} de ${emphases.required} ${emphases.required === 1 ? 'ênfase exigida' : 'ênfases exigidas'}`
      : undefined
  return (
    <Panel
      title="Vertentes"
      aria-label="Progresso por vertente"
      aside={
        rule && <span className="text-xs text-muted-foreground">{rule}</span>
      }
    >
      <ul className="flex flex-col gap-3">
        {branches.map((branch) => {
          const { value, text } = branchProgress(branch)
          const color = branch.color ?? COLORS.OTHER
          return (
            <li
              key={branch.branchId}
              className="flex gap-3 rounded-2xl bg-background/70 p-3 sm:p-4"
            >
              <span
                aria-hidden
                className="w-1 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                  <span className="font-semibold">{branch.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                    {text}
                  </span>
                </div>
                <Bar value={value} color={color} />
                {branch.overMax && (
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    Passou do máximo do grupo; as horas a mais podem não contar
                    no SIGAA.
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {hasEmphases && emphases.allowed !== null && emphases.allowed > 0 && (
        <p className="text-xs text-muted-foreground">
          A EC permite até {emphases.allowed}{' '}
          {emphases.allowed === 1 ? 'ênfase' : 'ênfases'}.
        </p>
      )}
    </Panel>
  )
}

function SubjectLine({
  color,
  name,
  meta,
}: {
  color: string
  name: string
  meta: string
}) {
  return (
    <li className="flex items-center gap-3 py-1.5 text-sm">
      <span
        aria-hidden
        className="h-5 w-1 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {meta}
      </span>
    </li>
  )
}

const LIST_LIMIT = 8

function CloseReminder({
  summary,
  onClose,
}: {
  summary: AcademicSummary
  onClose: () => void
}) {
  const stale = summary.staleInProgress.length
  const open = summary.inProgress.length
  const term = summary.currentTerm
  return (
    <output className="flex flex-col gap-3 rounded-3xl border border-orange-200 bg-orange-50 p-4 text-orange-950 sm:flex-row sm:items-center sm:gap-4 sm:p-5 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
      <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-background text-orange-700 sm:flex dark:text-orange-300">
        <ClockIcon weight="bold" className="size-5" />
      </span>
      <p className="flex-1 text-sm">
        {stale > 0 ? (
          <>
            <b>
              {stale === 1
                ? 'Uma disciplina ficou em Cursando'
                : `${stale} disciplinas ficaram em Cursando`}{' '}
              de semestres que já terminaram.
            </b>{' '}
            Informe a situação final para manter o progresso certo.
          </>
        ) : (
          <>
            <b>
              {term!.code} termina em {dayMonth(term!.endsAt)}.
            </b>{' '}
            Depois disso, informe a situação final{' '}
            {open === 1
              ? 'da disciplina que você está cursando'
              : `das ${open} disciplinas que você está cursando`}{' '}
            para manter o progresso certo.
          </>
        )}
      </p>
      <Button
        onClick={onClose}
        className="h-11 rounded-xl bg-orange-800 text-white hover:bg-orange-900 dark:bg-orange-700 dark:hover:bg-orange-600"
      >
        Fechar situação
      </Button>
    </output>
  )
}

function Dashboard({
  enrollment,
  summary,
}: {
  enrollment: EnrollmentView
  summary: AcademicSummary
}) {
  const { courses } = useCourse()
  const course = courses.find((item) => item.slug === enrollment.course.slug)
  const curriculum = course?.curriculumStructures.find(
    (item) => item.slug === enrollment.curriculum.slug,
  )
  const [dialog, setDialog] = useState<'manage' | 'migrate' | 'close' | null>(
    null,
  )
  const [showAll, setShowAll] = useState(false)

  const { progress } = summary
  const total = progress.total
  const remaining = Math.max(0, total.requiredHours - total.completedHours)
  const periods = periodsLeft(remaining, summary.avgPeriodHours)
  const closing: SubjectRecordView[] =
    summary.staleInProgress.length > 0
      ? summary.staleInProgress
      : summary.inProgress
  const available = showAll
    ? summary.available
    : summary.available.slice(0, LIST_LIMIT)
  const agendaHref = `/${enrollment.course.slug}/${enrollment.curriculum.slug}/agenda`

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel aria-label="Curso vigente">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border bg-background">
              <CourseDynamicIcon
                name={course?.icon ?? 'books'}
                className="size-7"
              />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Curso vigente
              </span>
              <span className="font-clash text-xl font-semibold">
                {enrollment.course.name}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip>
              <HourglassMediumIcon className="size-4" />
              EC {enrollment.curriculum.code}
            </Chip>
            {curriculum?.city && (
              <Chip>
                <MapPinIcon className="size-4" />
                {curriculum.city}
              </Chip>
            )}
            <Chip>Matrícula {enrollment.registrationNumber}</Chip>
            {enrollment.entryTerm && (
              <Chip>Ingresso {enrollment.entryTerm}</Chip>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => setDialog('manage')}
            >
              Gerenciar matrículas
            </Button>
            <Button
              variant="ghost"
              className="h-11 rounded-xl"
              onClick={() => setDialog('migrate')}
            >
              Migrar de estrutura curricular
            </Button>
          </div>
        </Panel>

        <Panel
          aria-labelledby="integration-title"
          className="flex-row items-center gap-5 sm:gap-6"
        >
          <Ring value={ratio(total.completedHours, total.requiredHours)} />
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              id="integration-title"
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              Integralização
            </h2>
            <p className="font-clash text-3xl font-semibold">
              {formatHours(total.completedHours)}{' '}
              <span className="text-base text-muted-foreground">
                de {formatHours(total.requiredHours)} h
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {remaining === 0
                ? 'Você cumpriu a carga horária mínima da EC.'
                : `Faltam ${formatHours(remaining)} h.${
                    periods
                      ? ` No ritmo médio da EC (${formatHours(summary.avgPeriodHours!)} h por período), você conclui em cerca de ${periods} ${periods === 1 ? 'período' : 'períodos'}.`
                      : ''
                  }`}
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Categories
          progress={progress}
          maxFreeHours={curriculum?.maxOptativeFreeHours}
        />
        <Branches progress={progress} />
      </div>

      {summary.closeReminderDue && closing.length > 0 && (
        <CloseReminder summary={summary} onClose={() => setDialog('close')} />
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel
          title={
            summary.currentTerm
              ? `Cursando em ${summary.currentTerm.code}`
              : 'Cursando'
          }
        >
          {summary.inProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma disciplina em Cursando.{' '}
              <Link href="/minha-area/historico" className="underline">
                Registrar no histórico
              </Link>
            </p>
          ) : (
            <ul>
              {summary.inProgress.map((record) => (
                <SubjectLine
                  key={record.id}
                  color={RECORD_NATURE_COLORS[record.nature]}
                  name={titleCase(record.subjectName)}
                  meta={record.subjectCode}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Liberadas para cursar"
          aside={
            <Link
              href={agendaHref}
              className="text-xs font-medium underline underline-offset-2"
            >
              Montar agenda
            </Link>
          }
        >
          {summary.available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma disciplina liberada agora.
            </p>
          ) : (
            <ul>
              {available.map((subject) => (
                <SubjectLine
                  key={subject.code}
                  color={
                    subject.nature === 'MANDATORY'
                      ? COLORS.COMPULSORY
                      : COLORS.OPTIONAL
                  }
                  name={
                    subject.missingCorequisites.length
                      ? `${titleCase(subject.name)} (com ${subject.missingCorequisites.join(', ')})`
                      : titleCase(subject.name)
                  }
                  meta={
                    subject.nature === 'OPTATIVE' || !subject.semester
                      ? 'Optativa'
                      : `${subject.semester}º`
                  }
                />
              ))}
            </ul>
          )}
          {summary.available.length > LIST_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="self-start text-sm underline underline-offset-2"
            >
              {showAll
                ? 'Mostrar menos'
                : `Mostrar todas (${summary.available.length})`}
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            Calculado pelos pré-requisitos da EC {enrollment.curriculum.code} e
            pelas equivalências.
          </p>
        </Panel>
      </div>

      <ManageEnrollmentsDialog
        open={dialog === 'manage'}
        onOpenChange={(open) => setDialog(open ? 'manage' : null)}
        current={enrollment}
      />
      <ChangeCurriculumDialog
        open={dialog === 'migrate'}
        onOpenChange={(open) => setDialog(open ? 'migrate' : null)}
        enrollment={enrollment}
      />
      <CloseSituationDialog
        open={dialog === 'close'}
        onOpenChange={(open) => setDialog(open ? 'close' : null)}
        records={closing}
      />
    </>
  )
}

export function ProgressPage() {
  const { data: user } = useSession()
  const { enrollment, isPending, error } = useCurrentEnrollment()
  const summary = useAcademicSummary(enrollment?.id)

  return (
    <AcademicShell
      eyebrow="Minha área"
      title={user ? `Olá, ${firstName(user.name)}` : 'Minha área'}
    >
      {isPending || (enrollment && summary.isPending) ? (
        <FlowLoading
          className="mx-auto mt-16 size-16"
          aria-label="Carregando"
        />
      ) : error || summary.error ? (
        <p role="alert" className={cn('text-sm text-destructive')}>
          {(error ?? summary.error)!.message}
        </p>
      ) : !enrollment ? (
        <FirstEnrollment />
      ) : (
        <Dashboard enrollment={enrollment} summary={summary.data!} />
      )}
    </AcademicShell>
  )
}
