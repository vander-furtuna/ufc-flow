'use client'

import type { RecordStatus } from '@ufc-flow/academic-core'
import { CaretDownIcon, DotsThreeIcon, PlusIcon } from '@phosphor-icons/react'
import type { EnrollmentView, SubjectRecordView } from '@ufc-flow/contracts'
import { useState } from 'react'
import { toast } from 'sonner'

import { AcademicShell } from '@/components/academic/academic-shell'
import { CloseSituationDialog } from '@/components/academic/close-situation-dialog'
import { FirstEnrollment } from '@/components/academic/first-enrollment'
import { RecordForm } from '@/components/academic/record-form'
import { StatusBadge } from '@/components/academic/status-badge'
import { FlowLoading } from '@/components/flow-loading'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  canRetry,
  formatGrade,
  formatHours,
  groupByTerm,
  NATURE_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  statusCounts,
  type TermGroup,
} from '@/lib/academic-record/history'
import {
  useAcademicSummary,
  useCurrentEnrollment,
  useDeleteRecord,
  useRecords,
} from '@/lib/academic-record/use-academic'
import { cn } from '@/lib/utils'
import { titleCase } from '@/utils/title-case'

// Semestres com mais disciplinas mostram as primeiras e "Mostrar mais"
const ROW_LIMIT = 5

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

function groupSummary(group: TermGroup) {
  const count = plural(group.records.length, 'disciplina', 'disciplinas')
  if (group.isCurrent) {
    return `${count} · ${formatHours(group.hours)} h · semestre vigente`
  }
  if (group.approved === group.records.length) {
    return `${count} · ${group.records.length === 1 ? 'aprovada' : 'todas aprovadas'}`
  }
  const parts = [
    count,
    group.approved > 0 ? plural(group.approved, 'aprovada', 'aprovadas') : null,
    ...group.others.map(
      ([status, total]) =>
        `${total} ${STATUS_LABELS[status].toLowerCase()}${total > 1 ? 's' : ''}`,
    ),
  ]
  return parts.filter(Boolean).join(' · ')
}

function recordNote(record: SubjectRecordView, all: SubjectRecordView[]) {
  const parts = [record.subjectCode, NATURE_LABELS[record.nature]]
  if (record.status === 'APROVEITADA' && record.originNote) {
    parts[1] = `de ${record.originNote}`
  }
  if (canRetry(record, all)) parts.push('nova tentativa disponível')
  return parts.join(' · ')
}

function RecordRow({
  record,
  all,
  onClose,
  onDelete,
}: {
  record: SubjectRecordView
  all: SubjectRecordView[]
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 border-t px-4 py-3 sm:grid-cols-[1fr_4rem_7.5rem_3.5rem_2.5rem] sm:px-5">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">
          {titleCase(record.subjectName)}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          <span className="sm:hidden">
            {record.subjectCode} · {record.workloadHours} h
          </span>
          <span className="hidden sm:inline">{recordNote(record, all)}</span>
        </span>
      </div>
      <span className="hidden text-sm text-muted-foreground tabular-nums sm:block">
        {record.workloadHours} h
      </span>
      <div className="flex flex-col items-end gap-1 sm:items-start">
        <StatusBadge status={record.status} />
        {record.grade !== null && (
          <span className="text-sm font-semibold sm:hidden">
            {formatGrade(record.grade)}
          </span>
        )}
      </div>
      <span className="hidden text-sm font-semibold tabular-nums sm:block">
        {record.grade !== null ? formatGrade(record.grade) : '—'}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Ações de ${record.subjectName} em ${record.term}`}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <DotsThreeIcon weight="bold" className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {record.status === 'CURSANDO' && (
            <DropdownMenuItem onSelect={onClose}>
              Fechar situação
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={onDelete}
          >
            Excluir registro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function TermSection({
  group,
  all,
  expanded,
  onToggle,
  onClose,
  onDelete,
}: {
  group: TermGroup
  all: SubjectRecordView[]
  expanded: boolean
  onToggle: () => void
  onClose: (records: SubjectRecordView[]) => void
  onDelete: (record: SubjectRecordView) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const open = group.records.filter((record) => record.status === 'CURSANDO')
  const rows = showAll ? group.records : group.records.slice(0, ROW_LIMIT)
  const titleId = `term-${group.term.replace('.', '-')}`
  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-3xl border bg-card"
    >
      <div className="flex items-center justify-between gap-3 bg-muted/60 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <h2 id={titleId} className="font-clash text-xl font-semibold">
            {group.term}
          </h2>
          <span className="text-xs text-muted-foreground sm:text-sm">
            {groupSummary(group)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {expanded && open.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              onClick={() => onClose(open)}
            >
              <span className="sm:hidden">Fechar</span>
              <span className="hidden sm:inline">Fechar situação</span>
            </Button>
          )}
          {expanded && group.average !== null && !group.isCurrent && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Média do semestre{' '}
              <b className="text-foreground">{formatGrade(group.average)}</b>
            </span>
          )}
          {!group.isCurrent && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Recolher' : 'Expandir'} ${group.term}`}
              className="flex size-9 items-center justify-center rounded-full hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <CaretDownIcon
                weight="bold"
                className={cn(
                  'size-4 transition-transform',
                  expanded && 'rotate-180',
                )}
              />
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <>
          <div
            aria-hidden
            className="hidden grid-cols-[1fr_4rem_7.5rem_3.5rem_2.5rem] gap-x-3 border-t px-5 py-2.5 text-xs text-muted-foreground sm:grid"
          >
            <span>Disciplina</span>
            <span>CH</span>
            <span>Situação</span>
            <span>Nota</span>
            <span />
          </div>
          <ul aria-label={`Disciplinas de ${group.term}`}>
            {rows.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                all={all}
                onClose={() => onClose([record])}
                onDelete={() => onDelete(record)}
              />
            ))}
          </ul>
          {group.records.length > ROW_LIMIT && (
            <div className="border-t px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                className="text-sm underline underline-offset-2"
              >
                {showAll
                  ? 'Mostrar menos'
                  : `Mostrar mais ${plural(group.records.length - ROW_LIMIT, 'disciplina', 'disciplinas')}`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function DeleteRecordDialog({
  record,
  onOpenChange,
}: {
  record: SubjectRecordView | null
  onOpenChange: (open: boolean) => void
}) {
  const remove = useDeleteRecord()
  return (
    <Dialog open={record !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir registro?</DialogTitle>
          <DialogDescription>
            {record &&
              `${record.subjectName} em ${record.term} sai do histórico e o progresso é recalculado.`}
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
              record &&
              remove.mutate(record.id, {
                onSuccess: () => {
                  toast.success('Registro excluído.')
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

function History({
  enrollment,
  currentTerm,
  onRegister,
}: {
  enrollment: EnrollmentView
  currentTerm: string | null
  onRegister: () => void
}) {
  const { data: records = [], isPending } = useRecords(enrollment.id)
  const [filter, setFilter] = useState<RecordStatus | null>(null)
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const [closing, setClosing] = useState<SubjectRecordView[] | null>(null)
  const [deleting, setDeleting] = useState<SubjectRecordView | null>(null)

  if (isPending) {
    return (
      <FlowLoading className="mx-auto mt-16 size-16" aria-label="Carregando" />
    )
  }

  const counts = statusCounts(records)
  const visible = filter
    ? records.filter((record) => record.status === filter)
    : records
  const groups = groupByTerm(visible, currentTerm)
  // Abertos: o vigente e o semestre anterior mais recente
  const isExpanded = (group: TermGroup, index: number) =>
    group.isCurrent || (toggled[group.term] ?? index < 2)

  const filters: [RecordStatus | null, string, number][] = [
    [null, 'Todas', records.length],
    ...STATUS_ORDER.filter((status) => counts.get(status)).map(
      (status): [RecordStatus, string, number] => [
        status,
        STATUS_LABELS[status],
        counts.get(status)!,
      ],
    ),
  ]

  return (
    <div className="flex flex-col gap-4">
      {records.length > 0 && (
        <fieldset className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <legend className="sr-only">Filtrar por situação</legend>
          {filters.map(([status, label, count]) => (
            <button
              key={label}
              type="button"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
              className={cn(
                'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                filter === status
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted',
              )}
            >
              {label} · {count}
            </button>
          ))}
        </fieldset>
      )}

      {records.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-3xl border border-dashed p-6">
          <p className="text-sm text-muted-foreground">
            Nenhum registro ainda. Comece pelo que você está cursando ou lance o
            histórico dos semestres passados, com a situação final de cada
            disciplina.
          </p>
          <Button className="rounded-xl lg:hidden" onClick={onRegister}>
            Registrar disciplina
          </Button>
        </div>
      ) : (
        groups.map((group, index) => (
          <TermSection
            key={group.term}
            group={group}
            all={records}
            expanded={isExpanded(group, index)}
            onToggle={() =>
              setToggled((current) => ({
                ...current,
                [group.term]: !isExpanded(group, index),
              }))
            }
            onClose={setClosing}
            onDelete={setDeleting}
          />
        ))
      )}

      <CloseSituationDialog
        open={closing !== null}
        onOpenChange={(open) => !open && setClosing(null)}
        records={closing ?? []}
      />
      <DeleteRecordDialog
        record={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  )
}

function RegisterPanel({
  enrollment,
  currentTerm,
  onDone,
  onCancel,
}: {
  enrollment: EnrollmentView
  currentTerm: string | null
  onDone?: () => void
  onCancel?: () => void
}) {
  const { data: records = [] } = useRecords(enrollment.id)
  if (!currentTerm) {
    return (
      <p className="text-sm text-muted-foreground">
        O semestre vigente ainda não foi marcado. Volte mais tarde para lançar
        registros.
      </p>
    )
  }
  return (
    <RecordForm
      enrollment={enrollment}
      records={records}
      currentTerm={currentTerm}
      onDone={onDone}
      onCancel={onCancel}
    />
  )
}

export function HistoryPage() {
  const { enrollment, isPending, error } = useCurrentEnrollment()
  const summary = useAcademicSummary(enrollment?.id)
  const [sheetOpen, setSheetOpen] = useState(false)
  const currentTerm = summary.data?.currentTerm?.code ?? null

  return (
    <AcademicShell
      eyebrow={
        enrollment
          ? `Minha área · ${enrollment.course.name} · EC ${enrollment.curriculum.code}`
          : 'Minha área'
      }
      title="Histórico"
      action={
        enrollment && (
          <Button
            className="h-12 flex-1 rounded-full shadow-lg lg:hidden"
            onClick={() => setSheetOpen(true)}
          >
            <PlusIcon weight="bold" className="size-4" />
            Registrar disciplina
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
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <History
            enrollment={enrollment}
            currentTerm={currentTerm}
            onRegister={() => setSheetOpen(true)}
          />
          <aside
            aria-labelledby="register-title"
            className="sticky top-6 hidden flex-col gap-5 rounded-3xl border bg-card p-6 shadow-sm lg:flex"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="register-title"
                className="font-clash text-xl font-semibold"
              >
                Registrar disciplina
              </h2>
              <p className="text-xs text-muted-foreground">
                Um registro por tentativa. O progresso é recalculado na hora.
              </p>
            </div>
            <RegisterPanel enrollment={enrollment} currentTerm={currentTerm} />
          </aside>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[92dvh] overflow-y-auto rounded-t-3xl px-5 pb-8 lg:hidden"
            >
              <SheetHeader className="px-0 text-left">
                <SheetTitle className="font-clash text-xl">
                  Registrar disciplina
                </SheetTitle>
                <SheetDescription>
                  Um registro por tentativa. O progresso é recalculado na hora.
                </SheetDescription>
              </SheetHeader>
              <RegisterPanel
                enrollment={enrollment}
                currentTerm={currentTerm}
                onDone={() => setSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      )}
    </AcademicShell>
  )
}
