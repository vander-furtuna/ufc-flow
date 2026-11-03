'use client'

import type {
  CloseSubjectRecordInput,
  SubjectRecordView,
} from '@ufc-flow/contracts'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { STATUS_BORDERS, STATUS_CLASSES } from '@/data/status-colors'
import {
  acceptsGrade,
  parseGrade,
  STATUS_LABELS,
} from '@/lib/academic-record/history'
import { useCloseRecord } from '@/lib/academic-record/use-academic'
import { cn } from '@/lib/utils'
import { titleCase } from '@/utils/title-case'

type ClosingStatus = CloseSubjectRecordInput['status']
const CLOSING: ClosingStatus[] = [
  'APROVADO',
  'REPROVADO',
  'TRANCADA',
  'SUPRIMIDA',
]

type Choice = { status: ClosingStatus | null; grade: string }

// Situação final de cada CURSANDO. Quem fica sem escolha continua cursando.
export function CloseSituationDialog({
  open,
  onOpenChange,
  records,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  records: readonly SubjectRecordView[]
}) {
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [error, setError] = useState<string | null>(null)
  const close = useCloseRecord()

  const choiceOf = (id: string): Choice =>
    choices[id] ?? { status: null, grade: '' }
  const update = (id: string, change: Partial<Choice>) =>
    setChoices((current) => ({
      ...current,
      [id]: { ...choiceOf(id), ...change },
    }))

  const chosen = records.filter((record) => choiceOf(record.id).status)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    for (const record of chosen) {
      const { status, grade } = choiceOf(record.id)
      const value = acceptsGrade(status!) ? parseGrade(grade) : null
      if (
        value === undefined ||
        (value !== null && (value < 0 || value > 10))
      ) {
        setError(`A nota de ${record.subjectName} vai de 0 a 10.`)
        return
      }
    }
    try {
      for (const record of chosen) {
        const { status, grade } = choiceOf(record.id)
        await close.mutateAsync({
          recordId: record.id,
          status: status!,
          grade: acceptsGrade(status!) ? (parseGrade(grade) ?? null) : null,
        })
      }
      toast.success(
        chosen.length === 1
          ? 'Situação fechada.'
          : `${chosen.length} situações fechadas.`,
      )
      setChoices({})
      onOpenChange(false)
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Não foi possível salvar.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Fechar situação</DialogTitle>
          <DialogDescription>
            Informe como terminou cada disciplina. Nota é opcional, só em
            Aprovado e Reprovado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {records.map((record) => {
              const choice = choiceOf(record.id)
              return (
                <li
                  key={record.id}
                  className="flex flex-col gap-2 rounded-2xl border p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {titleCase(record.subjectName)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {record.subjectCode} · {record.term}
                    </span>
                  </div>
                  <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <legend className="sr-only">
                      Situação de {record.subjectName}
                    </legend>
                    {CLOSING.map((status) => {
                      const on = choice.status === status
                      return (
                        <button
                          key={status}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            update(record.id, { status: on ? null : status })
                          }
                          className={cn(
                            'h-10 rounded-xl border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            on
                              ? cn(
                                  STATUS_CLASSES[status],
                                  STATUS_BORDERS[status],
                                  'border-2',
                                )
                              : 'bg-background hover:bg-muted',
                          )}
                        >
                          {STATUS_LABELS[status]}
                        </button>
                      )
                    })}
                  </fieldset>
                  {choice.status && acceptsGrade(choice.status) && (
                    <Input
                      aria-label={`Nota de ${record.subjectName} (opcional, 0 a 10)`}
                      inputMode="decimal"
                      placeholder="Nota (opcional), ex.: 7,5"
                      value={choice.grade}
                      onChange={(event) =>
                        update(record.id, { grade: event.target.value })
                      }
                      className="h-10 rounded-xl"
                    />
                  )}
                </li>
              )
            })}
          </ul>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={chosen.length === 0 || close.isPending}
            >
              {close.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
