import {
  collectCodes,
  findDependents,
  normalizeSearchText,
} from '@ufc-flow/academic-core'
import { Search } from 'lucide-react'
import { useState } from 'react'

import { cn } from '../components/ui'
import { formatCourseName } from '../sigaa/course'
import { SubjectDetail } from './subject-detail'
import type { Branch, Subject } from './types'

type NatureFilter = 'ALL' | Subject['nature']

type Column = { id: string; title: string; subjects: Subject[] }

// Obrigatórias por período e uma coluna de optativas: o semestre que o SIGAA
// dá às optativas costuma ser só o último período (D39)
function columnsOf(subjects: readonly Subject[]): Column[] {
  const bySemester = new Map<number, Subject[]>()
  const optatives: Subject[] = []
  for (const subject of subjects) {
    if (subject.nature === 'OPTATIVE') {
      optatives.push(subject)
      continue
    }
    const semester = subject.semester ?? 0
    bySemester.set(semester, [...(bySemester.get(semester) ?? []), subject])
  }
  const columns: Column[] = [...bySemester]
    .sort(([a], [b]) => a - b)
    .map(([semester, items]) => ({
      id: `p${semester}`,
      title: semester > 0 ? `${semester}º PERÍODO` : 'SEM PERÍODO',
      subjects: items,
    }))
  if (optatives.length > 0) {
    columns.push({ id: 'optatives', title: 'OPTATIVAS', subjects: optatives })
  }
  return columns
}

type CardRole = 'selected' | 'prerequisite' | 'unlocks' | 'dimmed' | 'normal'

const ROLE_LABELS: Partial<Record<CardRole, string>> = {
  selected: 'selecionada',
  prerequisite: 'pré-requisito',
  unlocks: 'libera',
}

function SubjectCard({
  subject,
  role,
  onSelect,
}: {
  subject: Subject
  role: CardRole
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={role === 'selected'}
      className={cn(
        'focus-visible:outline-primary flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border p-3 text-left transition-opacity focus-visible:outline-2',
        role === 'selected' &&
          'border-orange-500 bg-orange-500 text-white shadow-md',
        role === 'prerequisite' && 'bg-background border-2 border-cyan-500',
        role === 'unlocks' && 'bg-background border-2 border-orange-400',
        role === 'normal' && 'border-border bg-background hover:bg-card',
        role === 'dimmed' && 'border-border bg-background opacity-45',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px]">{subject.code}</span>
        {ROLE_LABELS[role] && (
          <span
            className={cn(
              'text-[11px] font-semibold',
              role === 'prerequisite' && 'text-cyan-700',
              role === 'unlocks' && 'text-orange-700',
            )}
          >
            {ROLE_LABELS[role]}
          </span>
        )}
      </span>
      <span className="text-sm leading-snug font-medium">
        {formatCourseName(subject.name)}
      </span>
      <span className="flex items-center justify-between">
        <span
          aria-hidden
          className={cn(
            'h-1 w-6 rounded-full',
            role === 'selected'
              ? 'bg-white'
              : subject.nature === 'MANDATORY'
                ? 'bg-mandatory'
                : 'bg-optative',
          )}
        />
        <span className="text-xs opacity-80">{subject.workloadHours}h</span>
      </span>
    </button>
  )
}

export function GridTab({
  subjects,
  branches,
}: {
  subjects: readonly Subject[]
  branches: readonly Branch[]
}) {
  const [query, setQuery] = useState('')
  const [nature, setNature] = useState<NatureFilter>('ALL')
  const [branchKey, setBranchKey] = useState('')
  const [highlight, setHighlight] = useState(true)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const byCode = new Map(subjects.map((item) => [item.code, item]))
  const branchByKey = new Map(branches.map((item) => [item.key, item]))
  const dependents = findDependents(
    new Map(subjects.map((item) => [item.code, item.prerequisites])),
  )
  const selected = selectedCode ? byCode.get(selectedCode) : undefined
  const prerequisites = new Set(collectCodes(selected?.prerequisites ?? null))
  const unlocks = new Set(selected ? (dependents.get(selected.code) ?? []) : [])

  const search = normalizeSearchText(query.trim())
  const visible = subjects.filter(
    (item) =>
      (nature === 'ALL' || item.nature === nature) &&
      (branchKey === '' ||
        item.branches.some((link) => link.key === branchKey)) &&
      (search === '' ||
        normalizeSearchText(`${item.code} ${item.name}`).includes(search)),
  )

  const roleOf = (subject: Subject): CardRole => {
    if (subject.code === selectedCode) return 'selected'
    if (!selected || !highlight) return 'normal'
    if (prerequisites.has(subject.code)) return 'prerequisite'
    if (unlocks.has(subject.code)) return 'unlocks'
    return 'dimmed'
  }

  const count = (value: NatureFilter) =>
    value === 'ALL'
      ? subjects.length
      : subjects.filter((item) => item.nature === value).length
  const natureFilters: [NatureFilter, string, string][] = [
    ['ALL', 'Todas', ''],
    ['MANDATORY', 'Obrigatórias', 'bg-mandatory'],
    ['OPTATIVE', 'Optativas', 'bg-optative'],
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border flex flex-wrap items-center gap-2 border-b px-6 py-3">
        <label className="border-border focus-within:outline-primary flex h-10 w-72 items-center gap-2 rounded-xl border px-3 focus-within:outline-2">
          <Search className="text-muted-foreground size-4" aria-hidden />
          <span className="sr-only">Buscar disciplina</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou código"
            className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
          />
        </label>
        {natureFilters.map(([value, label, dot]) => (
          <button
            key={value}
            type="button"
            aria-pressed={nature === value}
            onClick={() => setNature(value)}
            className={cn(
              'flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium',
              nature === value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-muted',
            )}
          >
            {dot && (
              <span aria-hidden className={cn('size-2 rounded-full', dot)} />
            )}
            {label} · {count(value)}
          </button>
        ))}
        {branches.length > 0 && (
          <label className="border-border flex h-10 items-center rounded-xl border px-3 text-sm">
            <span className="sr-only">Vertente</span>
            <select
              value={branchKey}
              onChange={(event) => setBranchKey(event.target.value)}
              className="cursor-pointer bg-transparent outline-none"
            >
              <option value="">Todas as vertentes</option>
              {branches.map((branch) => (
                <option key={branch.key} value={branch.key}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="border-border ml-auto flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium">
          <input
            type="checkbox"
            checked={highlight}
            onChange={(event) => setHighlight(event.target.checked)}
            className="accent-primary size-4"
          />
          Destacar requisitos
        </label>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 gap-4 overflow-auto p-6">
          {columnsOf(visible).map((column) => (
            <section
              key={column.id}
              aria-label={column.title}
              className="flex w-52 shrink-0 flex-col gap-2"
            >
              <header className="flex items-baseline justify-between">
                <h3 className="font-clash text-sm font-semibold">
                  {column.title}
                </h3>
                <span className="text-muted-foreground text-xs">
                  {column.subjects.reduce(
                    (total, item) => total + item.workloadHours,
                    0,
                  )}{' '}
                  h
                </span>
              </header>
              {column.subjects.map((subject) => (
                <SubjectCard
                  key={subject.code}
                  subject={subject}
                  role={roleOf(subject)}
                  onSelect={() =>
                    setSelectedCode(
                      subject.code === selectedCode ? null : subject.code,
                    )
                  }
                />
              ))}
            </section>
          ))}
          {visible.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Nenhuma disciplina com esses filtros.
            </p>
          )}
        </div>
        {selected && (
          <SubjectDetail
            subject={selected}
            subjects={byCode}
            dependents={dependents.get(selected.code) ?? []}
            branches={branchByKey}
            onSelect={setSelectedCode}
          />
        )}
      </div>
    </div>
  )
}
