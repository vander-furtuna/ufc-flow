'use client'

import type { RecordStatus } from '@ufc-flow/academic-core'
import { normalizeSearchText } from '@ufc-flow/academic-core'
import { CaretDownIcon, InfoIcon } from '@phosphor-icons/react'
import type { EnrollmentView, SubjectRecordView } from '@ufc-flow/contracts'
import { useQueries } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCourse } from '@/contexts/course'
import { COLORS, NATURE_COLORS } from '@/data/colors'
import { STATUS_BORDERS, STATUS_CLASSES } from '@/data/status-colors'
import {
  findSubjectAction,
  listRecordsAction,
} from '@/lib/academic-record/academic-actions'
import {
  acceptsGrade,
  lastAttempt,
  parseGrade,
  STATUS_HINTS,
  STATUS_LABELS,
  termOptions,
} from '@/lib/academic-record/history'
import {
  ACADEMIC_KEY,
  useAddRecord,
  useEnrollments,
} from '@/lib/academic-record/use-academic'
import { cn } from '@/lib/utils'
import { titleCase } from '@/utils/title-case'

import { nativeSelect } from './native-select'

const STATUSES: RecordStatus[] = [
  'CURSANDO',
  'APROVADO',
  'REPROVADO',
  'TRANCADA',
  'SUPRIMIDA',
  'APROVEITADA',
]

const CODE = /^[A-Z]{2,5}\d{3,5}$/

type PickedSubject = {
  code: string
  name: string
  color: string
  inCurriculum: boolean
}

// Registros aprovados de outras matrículas, para ligar o aproveitamento
function useSourceRecords(current: EnrollmentView) {
  const { data: enrollments = [] } = useEnrollments()
  const others = enrollments.filter((item) => item.id !== current.id)
  const results = useQueries({
    queries: others.map((enrollment) => ({
      queryKey: [...ACADEMIC_KEY, 'records', enrollment.id],
      queryFn: async () => {
        const result = await listRecordsAction(enrollment.id)
        if (!result.ok) throw new Error(result.problem.detail)
        return result.data
      },
    })),
  })
  return others.flatMap((enrollment, index) =>
    (results[index]?.data ?? [])
      .filter(
        (record) =>
          record.status === 'APROVADO' || record.status === 'APROVEITADA',
      )
      .map((record) => ({ record, course: enrollment.course.name })),
  )
}

export function RecordForm({
  enrollment,
  records,
  currentTerm,
  onDone,
  onCancel,
}: {
  enrollment: EnrollmentView
  records: readonly SubjectRecordView[]
  currentTerm: string
  onDone?: () => void
  onCancel?: () => void
}) {
  const ids = useId()
  const { courses } = useCourse()
  const subjects =
    courses
      .find((course) => course.slug === enrollment.course.slug)
      ?.curriculumStructures.find(
        (item) => item.slug === enrollment.curriculum.slug,
      )?.subjects ?? []

  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [picked, setPicked] = useState<PickedSubject | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [term, setTerm] = useState(currentTerm)
  const [status, setStatus] = useState<RecordStatus>('CURSANDO')
  const [grade, setGrade] = useState('')
  const [originNote, setOriginNote] = useState('')
  const [sourceRecordId, setSourceRecordId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const add = useAddRecord()
  const sources = useSourceRecords(enrollment)

  const terms = termOptions(currentTerm, enrollment.entryTerm)
  const isCurrent = term === currentTerm
  const needle = normalizeSearchText(query)
  const matches = needle
    ? subjects
        .filter(
          (subject) =>
            normalizeSearchText(subject.name).includes(needle) ||
            subject.code.toLowerCase().includes(needle),
        )
        .slice(0, 8)
    : []
  const typedCode = query.trim().toUpperCase()
  const canLookup =
    CODE.test(typedCode) &&
    !subjects.some((subject) => subject.code === typedCode)
  const last = picked ? lastAttempt(records, picked.code) : null

  const pickTerm = (value: string) => {
    setTerm(value)
    if (value !== currentTerm && status === 'CURSANDO') setStatus('APROVADO')
  }

  const lookup = async () => {
    setLookupError(null)
    const result = await findSubjectAction(typedCode)
    if (!result.ok) return setLookupError(result.problem.detail ?? null)
    if (!result.data)
      return setLookupError('Código não encontrado no catálogo.')
    setPicked({
      code: result.data.code,
      name: result.data.name,
      color: COLORS.OTHER,
      inCurriculum: false,
    })
    setListOpen(false)
  }

  const reset = () => {
    setPicked(null)
    setQuery('')
    setGrade('')
    setOriginNote('')
    setSourceRecordId('')
    setFormError(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!picked) return setFormError('Escolha a disciplina.')
    const value = acceptsGrade(status) ? parseGrade(grade) : null
    if (value === undefined || (value !== null && (value < 0 || value > 10))) {
      return setFormError('A nota vai de 0 a 10.')
    }
    const origin = status === 'APROVEITADA'
    add.mutate(
      {
        enrollmentId: enrollment.id,
        record: {
          subjectCode: picked.code,
          term,
          status,
          grade: value,
          sourceRecordId: origin && sourceRecordId ? sourceRecordId : null,
          originNote: origin ? originNote : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${titleCase(picked.name)} registrada em ${term}.`)
          reset()
          onDone?.()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${ids}-subject`}>Disciplina</Label>
        {picked ? (
          <button
            type="button"
            onClick={() => {
              setPicked(null)
              setListOpen(true)
            }}
            className="flex items-center gap-3 rounded-2xl border bg-muted/50 p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Trocar a disciplina ${titleCase(picked.name)}`}
          >
            <span
              aria-hidden
              className="h-9 w-1 shrink-0 rounded-full"
              style={{ background: picked.color }}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">
                {titleCase(picked.name)}
              </span>
              <span className="text-xs text-muted-foreground">
                {picked.code}
                {last
                  ? ` · última tentativa: ${STATUS_LABELS[last.status]} em ${last.term}`
                  : picked.inCurriculum
                    ? ''
                    : ' · fora da EC, conta como optativa livre'}
              </span>
            </span>
            <CaretDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ) : (
          <div className="relative">
            <Input
              id={`${ids}-subject`}
              autoComplete="off"
              placeholder="Nome ou código, ex.: ECO0021"
              value={query}
              onFocus={() => setListOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value)
                setListOpen(true)
                setLookupError(null)
              }}
              className="h-11 rounded-xl"
            />
            {listOpen && (matches.length > 0 || canLookup) && (
              <ul
                id={`${ids}-subjects`}
                aria-label="Disciplinas encontradas"
                className="absolute inset-x-0 top-12 z-20 flex max-h-72 flex-col overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
              >
                {matches.map((subject) => (
                  <li key={subject.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked({
                          code: subject.code,
                          name: subject.name,
                          color: NATURE_COLORS[subject.nature] ?? COLORS.OTHER,
                          inCurriculum: true,
                        })
                        setListOpen(false)
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <span className="truncate">
                        {titleCase(subject.name)}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {subject.code}
                      </span>
                    </button>
                  </li>
                ))}
                {canLookup && (
                  <li>
                    <button
                      type="button"
                      onClick={lookup}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      Buscar {typedCode} no catálogo (fora da EC)
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
        {lookupError && (
          <p role="alert" className="text-xs text-destructive">
            {lookupError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${ids}-term`}>Semestre</Label>
        <select
          id={`${ids}-term`}
          value={term}
          onChange={(event) => pickTerm(event.target.value)}
          className={nativeSelect}
        >
          {terms.map((option) => (
            <option key={option} value={option}>
              {option === currentTerm ? `${option} (vigente)` : option}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Situação</legend>
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((option) => {
            const on = option === status
            const disabled = option === 'CURSANDO' && !isCurrent
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                disabled={disabled}
                onClick={() => setStatus(option)}
                className={cn(
                  'h-11 rounded-xl border px-1 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
                  on
                    ? cn(
                        STATUS_CLASSES[option],
                        STATUS_BORDERS[option],
                        'border-2',
                      )
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {STATUS_LABELS[option]}
              </button>
            )
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          {STATUS_HINTS[status]}
        </span>
      </fieldset>

      {acceptsGrade(status) && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${ids}-grade`}>
            Nota final{' '}
            <span className="font-normal text-muted-foreground">
              (opcional, 0 a 10)
            </span>
          </Label>
          <Input
            id={`${ids}-grade`}
            inputMode="decimal"
            placeholder="Ex.: 7,5"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
      )}

      {status === 'APROVEITADA' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${ids}-origin`}>Origem do aproveitamento</Label>
          <Input
            id={`${ids}-origin`}
            placeholder="Ex.: Cálculo I · UECE, 2022.1"
            maxLength={200}
            value={originNote}
            onChange={(event) => setOriginNote(event.target.value)}
            className="h-11 rounded-xl"
          />
          {sources.length > 0 ? (
            <select
              aria-label="Registro de origem em outra matrícula"
              value={sourceRecordId}
              onChange={(event) => setSourceRecordId(event.target.value)}
              className={nativeSelect}
            >
              <option value="">Sem vínculo com outra matrícula</option>
              {sources.map(({ record, course }) => (
                <option key={record.id} value={record.id}>
                  {titleCase(record.subjectName)} · {course}, {record.term}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-muted-foreground">
              Ou vincule a um registro de outra matrícula sua.
            </span>
          )}
        </div>
      )}

      {(formError ?? add.error) && (
        <p role="alert" className="text-sm text-destructive">
          {formError ?? add.error?.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={add.isPending}
          className="h-11 flex-1 rounded-xl"
        >
          {add.isPending ? 'Salvando…' : 'Salvar registro'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => {
              reset()
              onCancel()
            }}
          >
            Cancelar
          </Button>
        )}
      </div>

      <div className="flex gap-2 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          Depois de Reprovado, Trancada ou Suprimida você pode cursar de novo
          num semestre posterior. Aprovado e Aproveitada encerram a disciplina.
        </span>
      </div>
    </form>
  )
}
