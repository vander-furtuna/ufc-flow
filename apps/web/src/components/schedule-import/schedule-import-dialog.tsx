'use client'

import { CheckIcon, CloudArrowUpIcon, WarningIcon } from '@phosphor-icons/react'
import { useId, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  missingClasses,
  type CourseOption,
  type ImportCandidate,
} from '@/lib/planning/import-candidates'
import type { ImportPreview } from '@/lib/planning/schedule-actions'
import { cn } from '@/lib/utils'

export type ImportChoice = { candidate: ImportCandidate; option: CourseOption }

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

type RowState = {
  option: CourseOption
  available: boolean
  missing: number
}

function rowState(
  candidate: ImportCandidate,
  optionIndex: number,
  preview: ImportPreview,
): RowState {
  const option = candidate.options[optionIndex] ?? candidate.options[0]!
  const entry = preview[`${candidate.term}|${option.courseSlug}`]
  return {
    option,
    available: entry?.available ?? false,
    missing: entry?.available
      ? missingClasses(candidate.schedule, new Set(entry.sections)).length
      : 0,
  }
}

function Status({
  tone,
  children,
}: {
  tone: 'ok' | 'warn'
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'flex items-start gap-1.5 text-[13px] leading-snug',
        tone === 'ok'
          ? 'text-green-700 dark:text-green-400'
          : 'text-amber-700 dark:text-amber-400',
      )}
    >
      {tone === 'ok' ? (
        <CheckIcon weight="bold" className="mt-0.5 size-3.5 shrink-0" />
      ) : (
        <WarningIcon weight="bold" className="mt-0.5 size-3.5 shrink-0" />
      )}
      <span>{children}</span>
    </span>
  )
}

function CandidateRow({
  candidate,
  state,
  checked,
  optionIndex,
  onToggle,
  onChooseOption,
}: {
  candidate: ImportCandidate
  state: RowState
  checked: boolean
  optionIndex: number
  onToggle: (checked: boolean) => void
  onChooseOption: (index: number) => void
}) {
  const id = useId()
  const total = candidate.schedule.classes.length
  return (
    <li
      className={cn(
        'flex items-start gap-3.5 rounded-2xl p-4 transition-colors',
        checked
          ? 'border-2 border-primary bg-muted/60'
          : 'border bg-background',
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={!state.available}
        onCheckedChange={(value) => onToggle(value === true)}
        className="mt-0.5 size-5 rounded-md"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label
          htmlFor={id}
          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
        >
          <span className="text-[15px] font-semibold">
            {candidate.schedule.name}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {candidate.term} · {plural(total, 'turma', 'turmas')}
          </span>
        </label>
        {!state.available ? (
          <Status tone="warn">
            O semestre {candidate.term} não tem turmas no Flow; esta agenda
            continua só neste navegador
          </Status>
        ) : candidate.ambiguous ? (
          <>
            <span className="text-[13px] leading-snug text-muted-foreground">
              A estrutura {candidate.schedule.courseId} existe em{' '}
              {candidate.options.length} cursos. Pelas turmas da agenda,
              sugerimos:
            </span>
            <label className="flex flex-col">
              <span className="sr-only">
                Curso da agenda {candidate.schedule.name}
              </span>
              <select
                value={optionIndex}
                onChange={(event) => onChooseOption(Number(event.target.value))}
                className="h-10 w-full rounded-xl border bg-background px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:scheme-dark"
              >
                {candidate.options.map((option, index) => (
                  <option key={option.courseSlug} value={index}>
                    {option.courseName} ({option.matches} de {total}
                    {index === 0 ? ' turmas batem' : ''})
                  </option>
                ))}
              </select>
            </label>
            {state.missing > 0 && (
              <Status tone="warn">
                {plural(
                  state.missing,
                  'turma não existe mais no SIGAA e fica de fora',
                  'turmas não existem mais no SIGAA e ficam de fora',
                )}
              </Status>
            )}
          </>
        ) : state.missing > 0 ? (
          <Status tone="warn">
            {plural(
              state.missing,
              'turma não existe mais no SIGAA e fica de fora',
              'turmas não existem mais no SIGAA e ficam de fora',
            )}
          </Status>
        ) : (
          <Status tone="ok">
            {state.option.courseName} · todas as turmas encontradas
          </Status>
        )}
      </div>
    </li>
  )
}

// Diálogo do primeiro login: agendas locais para levar para a conta
// (telas Importar-Agendas e Mobile-Importar-Agendas)
export function ScheduleImportDialog({
  open,
  candidates,
  preview,
  isMobile,
  isImporting,
  onImport,
  onDismiss,
}: {
  open: boolean
  candidates: ImportCandidate[]
  preview: ImportPreview
  isMobile: boolean
  isImporting: boolean
  onImport: (choices: ImportChoice[]) => void
  onDismiss: () => void
}) {
  const [optionIndex, setOptionIndex] = useState<Record<string, number>>({})
  // Marcadas de início: as que entram inteiras
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        candidates
          .filter((candidate) => {
            const state = rowState(candidate, 0, preview)
            return state.available && state.missing === 0
          })
          .map((candidate) => candidate.schedule.id),
      ),
  )

  const rows = candidates.map((candidate) => {
    const index = optionIndex[candidate.schedule.id] ?? 0
    return { candidate, index, state: rowState(candidate, index, preview) }
  })
  const chosen = rows.filter(
    ({ candidate, state }) =>
      state.available && selected.has(candidate.schedule.id),
  )
  const count = candidates.length
  const title = isMobile
    ? `${plural(count, 'agenda', 'agendas')} neste aparelho`
    : `Encontramos ${plural(count, 'agenda', 'agendas')} neste navegador`
  const description = isMobile
    ? 'Importe para a sua conta e veja em qualquer dispositivo.'
    : 'Importe para a sua conta e acesse de qualquer dispositivo. As cópias locais continuam aqui até você apagá-las.'

  const icon = (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
      <CloudArrowUpIcon weight="bold" className="size-6" aria-hidden />
    </span>
  )

  const body = (
    <ul className="flex flex-col gap-2.5" aria-label="Agendas encontradas">
      {rows.map(({ candidate, index, state }) => (
        <CandidateRow
          key={candidate.schedule.id}
          candidate={candidate}
          state={state}
          optionIndex={index}
          checked={state.available && selected.has(candidate.schedule.id)}
          onToggle={(checked) =>
            setSelected((current) => {
              const next = new Set(current)
              if (checked) next.add(candidate.schedule.id)
              else next.delete(candidate.schedule.id)
              return next
            })
          }
          onChooseOption={(value) =>
            setOptionIndex((current) => ({
              ...current,
              [candidate.schedule.id]: value,
            }))
          }
        />
      ))}
    </ul>
  )

  const importButton = (
    <Button
      className={cn(
        'h-11 rounded-[14px] px-5 font-semibold',
        isMobile && 'w-full',
      )}
      disabled={chosen.length === 0}
      isLoading={isImporting}
      onClick={() =>
        onImport(
          chosen.map(({ candidate, state }) => ({
            candidate,
            option: state.option,
          })),
        )
      }
    >
      {chosen.length === 0
        ? 'Selecione uma agenda'
        : `Importar ${plural(chosen.length, 'agenda', 'agendas')}`}
    </Button>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(next) => !next && onDismiss()}>
        <SheetContent
          side="bottom"
          overlayClassName="z-[900]"
          className="z-[900] flex max-h-[92dvh] flex-col gap-4 overflow-y-auto rounded-t-3xl px-5 pt-8 pb-6"
        >
          <SheetHeader className="items-start gap-3 p-0 text-left">
            {icon}
            <SheetTitle className="font-clash text-[22px] leading-7 font-semibold">
              {title}
            </SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {body}
          {importButton}
          <Button
            variant="ghost"
            className="h-11 text-muted-foreground"
            onClick={onDismiss}
          >
            Agora não
          </Button>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent className="z-[900] flex max-h-[90dvh] flex-col gap-5 overflow-y-auto rounded-3xl p-7 sm:max-w-[640px]">
        <DialogHeader className="flex-row items-start gap-4 space-y-0 text-left">
          {icon}
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="font-clash text-2xl leading-[30px] font-semibold">
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>
        {body}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            className="h-11 rounded-[14px]"
            onClick={onDismiss}
          >
            Agora não
          </Button>
          {importButton}
        </div>
      </DialogContent>
    </Dialog>
  )
}
