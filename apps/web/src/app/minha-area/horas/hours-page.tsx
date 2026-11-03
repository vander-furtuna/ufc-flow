'use client'

import { PlusIcon } from '@phosphor-icons/react'
import type {
  AcademicSummary,
  ActivityRecordView,
  EnrollmentView,
} from '@ufc-flow/contracts'
import { useState } from 'react'
import { toast } from 'sonner'

import { AcademicShell, Panel } from '@/components/academic/academic-shell'
import { ActivityDialog } from '@/components/academic/activity-dialog'
import { ActivityItem } from '@/components/academic/activity-item'
import { FirstEnrollment } from '@/components/academic/first-enrollment'
import { FlowLoading } from '@/components/flow-loading'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { COLORS } from '@/data/colors'
import { formatHours } from '@/lib/academic-record/history'
import {
  useAcademicSummary,
  useActivities,
  useCurrentEnrollment,
  useDeleteActivity,
} from '@/lib/academic-record/use-academic'
import { cn } from '@/lib/utils'

type Kind = ActivityRecordView['kind']

function HoursBar({ value, color }: { value: number; color: string }) {
  return (
    <div
      aria-hidden
      className="h-2 w-full overflow-hidden rounded-full bg-foreground/10"
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(1, value) * 100}%`, background: color }}
      />
    </div>
  )
}

function Requirement({
  title,
  completed,
  required,
  color,
  children,
}: {
  title: string
  completed: number
  required: number
  color: string
  children?: React.ReactNode
}) {
  return (
    <Panel
      title={title}
      aside={
        <span className="shrink-0 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
          <b className="font-semibold text-foreground">
            {formatHours(completed)}
          </b>{' '}
          / {formatHours(required)} h
        </span>
      }
    >
      <HoursBar value={required ? completed / required : 1} color={color} />
      {children}
    </Panel>
  )
}

function Summary({ summary }: { summary: AcademicSummary }) {
  const { complementary, extension } = summary.progress
  const names = new Map(
    summary.categories.map((category) => [category.id, category]),
  )
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      {complementary.requiredHours > 0 ? (
        <Requirement
          title="Atividades complementares"
          completed={complementary.completedHours}
          required={complementary.requiredHours}
          color={COLORS.COMPLEMENTARY_ACTIVITY}
        >
          {complementary.componentCompleted && (
            <p className="text-sm text-muted-foreground">
              O componente de atividades complementares já está integralizado no
              seu histórico.
            </p>
          )}
          {complementary.byCategory.length > 0 && (
            <ul className="flex flex-col gap-2 border-t pt-3 text-sm">
              {complementary.byCategory.map((item) => {
                const category = item.categoryId
                  ? names.get(item.categoryId)
                  : null
                return (
                  <li
                    key={item.categoryId ?? 'none'}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="min-w-0 truncate">
                      {category?.name ?? 'Sem categoria'}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {item.countedHours < item.declaredHours
                        ? `${formatHours(item.countedHours)} de ${formatHours(item.declaredHours)} h (teto ${formatHours(category?.maxHours ?? 0)} h)`
                        : `${formatHours(item.countedHours)} h`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Requirement>
      ) : (
        <Panel title="Atividades complementares">
          <p className="text-sm text-muted-foreground">
            Esta estrutura curricular não exige horas complementares.
          </p>
        </Panel>
      )}
      {extension.requiredHours > 0 ? (
        <Requirement
          title="Extensão"
          completed={extension.completedHours}
          required={extension.requiredHours}
          color={COLORS.EXTENSION}
        >
          <p className="text-sm text-muted-foreground">
            {formatHours(extension.fromSubjectsHours)} h das disciplinas
            cumpridas e {formatHours(extension.fromActivitiesHours)} h de
            atividades de extensão.
          </p>
        </Requirement>
      ) : (
        <Panel title="Extensão">
          <p className="text-sm text-muted-foreground">Não exigida nesta EC.</p>
        </Panel>
      )}
    </div>
  )
}

function DeleteActivityDialog({
  activity,
  onOpenChange,
}: {
  activity: ActivityRecordView | null
  onOpenChange: (open: boolean) => void
}) {
  const remove = useDeleteActivity()
  return (
    <Dialog open={activity !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir atividade?</DialogTitle>
          <DialogDescription>
            {activity &&
              `${activity.title} sai das suas horas${activity.certificateFileId ? ' e o certificado é apagado' : ''}.`}
          </DialogDescription>
        </DialogHeader>
        {remove.error && (
          <p role="alert" className="text-sm text-destructive">
            {remove.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              activity &&
              remove.mutate(activity.id, {
                onSuccess: () => {
                  toast.success('Atividade excluída.')
                  onOpenChange(false)
                },
              })
            }
          >
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Activities({
  enrollment,
  summary,
  onLaunch,
  onEdit,
}: {
  enrollment: EnrollmentView
  summary: AcademicSummary
  onLaunch: (kind: Kind) => void
  onEdit: (activity: ActivityRecordView) => void
}) {
  const { data: activities = [], isPending } = useActivities(enrollment.id)
  const [filter, setFilter] = useState<Kind | null>(null)
  const [deleting, setDeleting] = useState<ActivityRecordView | null>(null)
  const names = new Map(
    summary.categories.map((category) => [category.id, category.name]),
  )
  const visible = filter
    ? activities.filter((activity) => activity.kind === filter)
    : activities
  const total = (kind: Kind) =>
    activities
      .filter((activity) => activity.kind === kind)
      .reduce((sum, activity) => sum + activity.hours, 0)

  const filters: [Kind | null, string][] = [
    [null, `Todas · ${activities.length}`],
    [
      'COMPLEMENTARY',
      `Complementares · ${formatHours(total('COMPLEMENTARY'))} h`,
    ],
    ['EXTENSION', `Extensão · ${formatHours(total('EXTENSION'))} h`],
  ]

  return (
    <Panel
      title="Atividades"
      aside={
        <Button
          size="sm"
          className="hidden h-9 rounded-xl lg:inline-flex"
          onClick={() => onLaunch(filter ?? 'COMPLEMENTARY')}
        >
          <PlusIcon weight="bold" className="size-4" />
          Lançar atividade
        </Button>
      }
      className="pb-2 sm:pb-3"
    >
      <fieldset className="-mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <legend className="sr-only">Filtrar por tipo</legend>
        {filters.map(([kind, label]) => (
          <button
            key={label}
            type="button"
            aria-pressed={filter === kind}
            onClick={() => setFilter(kind)}
            className={cn(
              'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              filter === kind
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted',
            )}
          >
            {label}
          </button>
        ))}
      </fieldset>
      {isPending ? (
        <FlowLoading className="mx-auto my-8 size-12" aria-label="Carregando" />
      ) : visible.length === 0 ? (
        <p className="pb-3 text-sm text-muted-foreground">
          {activities.length === 0
            ? 'Nenhuma atividade ainda. Lance monitorias, eventos, cursos e projetos de extensão com as horas do certificado.'
            : 'Nenhuma atividade deste tipo.'}
        </p>
      ) : (
        <ul className="-mx-5 sm:-mx-6">
          {visible.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              categoryName={
                activity.categoryId
                  ? (names.get(activity.categoryId) ?? null)
                  : null
              }
              onEdit={() => onEdit(activity)}
              onDelete={() => setDeleting(activity)}
            />
          ))}
        </ul>
      )}
      <DeleteActivityDialog
        activity={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </Panel>
  )
}

export function HoursPage() {
  const { enrollment, isPending, error } = useCurrentEnrollment()
  const summary = useAcademicSummary(enrollment?.id)
  const [dialog, setDialog] = useState<{
    activity: ActivityRecordView | null
    kind: Kind
  } | null>(null)

  return (
    <AcademicShell
      eyebrow={
        enrollment
          ? `Minha área · ${enrollment.course.name} · EC ${enrollment.curriculum.code}`
          : 'Minha área'
      }
      title="Horas complementares"
      action={
        enrollment && (
          <Button
            className="h-12 flex-1 rounded-full shadow-lg lg:hidden"
            onClick={() => setDialog({ activity: null, kind: 'COMPLEMENTARY' })}
          >
            <PlusIcon weight="bold" className="size-4" />
            Lançar atividade
          </Button>
        )
      }
    >
      {isPending || (enrollment && summary.isPending) ? (
        <FlowLoading
          className="mx-auto mt-16 size-16"
          aria-label="Carregando"
        />
      ) : error || summary.error ? (
        <p role="alert" className="text-sm text-destructive">
          {(error ?? summary.error)!.message}
        </p>
      ) : !enrollment ? (
        <FirstEnrollment />
      ) : (
        <>
          <Summary summary={summary.data!} />
          <Activities
            enrollment={enrollment}
            summary={summary.data!}
            onLaunch={(kind) => setDialog({ activity: null, kind })}
            onEdit={(activity) => setDialog({ activity, kind: activity.kind })}
          />
          <ActivityDialog
            open={dialog !== null}
            onOpenChange={(open) => !open && setDialog(null)}
            enrollmentId={enrollment.id}
            categories={summary.data!.categories}
            activity={dialog?.activity ?? null}
            defaultKind={dialog?.kind}
          />
        </>
      )}
    </AcademicShell>
  )
}
