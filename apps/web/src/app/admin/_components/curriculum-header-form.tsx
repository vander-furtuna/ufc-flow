'use client'

import type { CurriculumHeader } from '@ufc-flow/contracts'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type NumberField = {
  [K in keyof CurriculumHeader]: CurriculumHeader[K] extends number | null
    ? K
    : never
}[keyof CurriculumHeader]

const HOURS: [NumberField, string][] = [
  ['minTotalHours', 'CH total mínima'],
  ['maxTotalHours', 'CH total máxima'],
  ['mandatoryHours', 'CH obrigatória'],
  ['optativeHours', 'CH optativa'],
  ['extensionHours', 'CH de extensão'],
  ['specificActivityHours', 'Atividade acadêmica específica'],
  ['maxFreeOptativeHours', 'Optativa livre máxima'],
  ['periodMinHours', 'CH mínima por período'],
  ['periodAvgHours', 'CH média por período'],
  ['periodMaxHours', 'CH máxima por período'],
  ['minPeriods', 'Prazo mínimo (períodos)'],
  ['avgPeriods', 'Prazo médio (períodos)'],
  ['maxPeriods', 'Prazo máximo (períodos)'],
  ['minEmphases', 'Ênfases exigidas'],
  ['maxEmphases', 'Ênfases permitidas'],
]

// Campos que podem ficar vazios (o SIGAA nem sempre mostra)
const NULLABLE = new Set<NumberField>([
  'maxTotalHours',
  'minEmphases',
  'maxEmphases',
])

export const EMPTY_HEADER: CurriculumHeader = {
  code: '',
  effectiveTerm: '',
  slug: '',
  sigaaId: null,
  matrixName: '',
  unitName: null,
  minTotalHours: 0,
  maxTotalHours: null,
  mandatoryHours: 0,
  optativeHours: 0,
  extensionHours: 0,
  specificActivityHours: 0,
  maxFreeOptativeHours: 0,
  minPeriods: 1,
  avgPeriods: 1,
  maxPeriods: 1,
  periodMinHours: 0,
  periodAvgHours: 0,
  periodMaxHours: 0,
  minEmphases: null,
  maxEmphases: null,
}

const slugOf = (code: string) =>
  code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Cabeçalho da EC: criar à mão ou editar. Com matrícula vinculada, a API
// recusa mudar código, vigor, endereço e cargas.
export function CurriculumHeaderForm({
  initial,
  submitLabel,
  locked = false,
  pending,
  onSubmit,
}: {
  initial: CurriculumHeader
  submitLabel: string
  locked?: boolean
  pending: boolean
  onSubmit: (header: CurriculumHeader) => void
}) {
  const [header, setHeader] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(initial.slug !== '')

  const set = <K extends keyof CurriculumHeader>(
    key: K,
    value: CurriculumHeader[K],
  ) => setHeader((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(header)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="header-code">Código da EC</Label>
          <Input
            id="header-code"
            required
            placeholder="2026.1"
            value={header.code}
            disabled={locked}
            onChange={(event) => {
              set('code', event.target.value)
              if (!slugTouched) set('slug', slugOf(event.target.value))
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="header-term">Vigor</Label>
          <Input
            id="header-term"
            required
            placeholder="2026.1"
            pattern="\d{4}\.[12]"
            value={header.effectiveTerm}
            disabled={locked}
            onChange={(event) => set('effectiveTerm', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="header-slug">Endereço</Label>
          <Input
            id="header-slug"
            required
            spellCheck={false}
            value={header.slug}
            disabled={locked}
            onChange={(event) => {
              setSlugTouched(true)
              set('slug', event.target.value)
            }}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="header-matrix">Matriz (como no SIGAA)</Label>
          <Input
            id="header-matrix"
            required
            value={header.matrixName}
            onChange={(event) => set('matrixName', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="header-unit">Unidade</Label>
          <Input
            id="header-unit"
            value={header.unitName ?? ''}
            onChange={(event) => set('unitName', event.target.value || null)}
          />
        </div>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-3" disabled={locked}>
        <legend className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Cargas e prazos
        </legend>
        {HOURS.map(([key, label]) => (
          <div key={key} className="flex flex-col gap-2">
            <Label htmlFor={`header-${key}`}>{label}</Label>
            <Input
              id={`header-${key}`}
              type="number"
              inputMode="numeric"
              min={0}
              required={!NULLABLE.has(key)}
              value={header[key] ?? ''}
              onChange={(event) =>
                set(
                  key,
                  event.target.value === '' && NULLABLE.has(key)
                    ? null
                    : Number(event.target.value),
                )
              }
            />
          </div>
        ))}
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" isLoading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
