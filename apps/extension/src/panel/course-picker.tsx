import { normalizeSearchText, type SigaaCourse } from '@ufc-flow/academic-core'
import { useState } from 'react'

import { cn } from '../components/ui'

const MAX_RESULTS = 8

// Escolha manual do curso no catálogo do SIGAA (D34). Os candidatos do
// reconhecimento aparecem primeiro.
export function CoursePicker({
  catalog,
  candidates,
  selectedId,
  onPick,
}: {
  catalog: readonly SigaaCourse[]
  candidates: readonly SigaaCourse[]
  selectedId: string | null
  onPick: (sigaaId: string) => void
}) {
  const [query, setQuery] = useState('')
  const search = normalizeSearchText(query.trim())
  const options =
    search === ''
      ? candidates.slice(0, MAX_RESULTS)
      : catalog
          .filter((course) =>
            normalizeSearchText(
              `${course.name} ${course.city} ${course.sigaaId}`,
            ).includes(search),
          )
          .slice(0, MAX_RESULTS)

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Curso no SIGAA
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, cidade ou código"
          className="border-border focus-visible:outline-primary h-10 rounded-xl border px-3 font-normal outline-none focus-visible:outline-2"
        />
      </label>
      <ul className="flex flex-col gap-1" aria-label="Cursos encontrados">
        {options.map((course) => (
          <li key={course.sigaaId}>
            <button
              type="button"
              aria-pressed={course.sigaaId === selectedId}
              onClick={() => onPick(course.sigaaId)}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm',
                course.sigaaId === selectedId
                  ? 'border-primary bg-muted'
                  : 'border-border hover:bg-muted',
              )}
            >
              <span>
                {course.name}
                <span className="text-muted-foreground"> · {course.city}</span>
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                {course.sigaaId}
              </span>
            </button>
          </li>
        ))}
        {options.length === 0 && (
          <li className="text-muted-foreground text-sm">
            {search === ''
              ? 'Digite para buscar o curso.'
              : 'Nenhum curso encontrado.'}
          </li>
        )}
      </ul>
    </div>
  )
}
