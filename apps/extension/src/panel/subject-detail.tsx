import { formatRequirement } from '@ufc-flow/academic-core'
import type { ReactNode } from 'react'

import { Chip } from '../components/ui'
import { formatCourseName } from '../sigaa/course'
import { NATURE_LABELS, SUBJECT_TYPE_LABELS } from '../sigaa/labels'
import { RequirementView } from './requirement-view'
import type { Branch, Subject } from './types'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide">
        {title}
      </h3>
      {children}
    </section>
  )
}

const Empty = () => <p className="text-muted-foreground text-sm">Nenhum</p>

// Painel da disciplina selecionada na grade
export function SubjectDetail({
  subject,
  subjects,
  dependents,
  branches,
  onSelect,
}: {
  subject: Subject
  subjects: ReadonlyMap<string, Subject>
  dependents: readonly string[]
  branches: ReadonlyMap<string, Branch>
  onSelect: (code: string) => void
}) {
  const stats = [
    ['Aula', `${subject.theoryHours}h`],
    ['Lab', `${subject.labHours}h`],
    ['EAD', `${subject.eadHours}h`],
    ['Extensão', `${subject.extensionHours}h`],
    ['Créditos', String(subject.credits)],
    ['Total', `${subject.workloadHours}h`],
  ] as const

  return (
    <aside
      aria-label={`Detalhes de ${subject.code}`}
      className="border-border bg-card flex w-[360px] shrink-0 flex-col gap-5 overflow-y-auto border-l p-5"
    >
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground font-mono text-xs">
          {subject.code}
        </p>
        <h2 className="font-clash text-xl leading-tight font-semibold">
          {subject.name}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{NATURE_LABELS[subject.nature]}</Chip>
          {subject.semester !== null && (
            <Chip>{subject.semester}º período</Chip>
          )}
          <Chip>{SUBJECT_TYPE_LABELS[subject.type]}</Chip>
          {subject.durationTerms === 2 && <Chip>Anual</Chip>}
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-2">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className={
              label === 'Total'
                ? 'rounded-xl border border-orange-200 bg-orange-50 p-2.5 text-center'
                : 'border-border bg-background rounded-xl border p-2.5 text-center'
            }
          >
            <dd className="font-clash text-base font-semibold">{value}</dd>
            <dt className="text-muted-foreground text-xs">{label}</dt>
          </div>
        ))}
      </dl>

      <Section title="PRÉ-REQUISITOS">
        {subject.prerequisites ? (
          <>
            <RequirementView
              expr={subject.prerequisites}
              subjects={subjects}
              onSelect={onSelect}
            />
            <p className="text-muted-foreground font-mono text-xs">
              No SIGAA: {formatRequirement(subject.prerequisites)}
            </p>
          </>
        ) : (
          <Empty />
        )}
      </Section>

      <Section title="LIBERA">
        {dependents.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {dependents.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onSelect(code)}
                className="cursor-pointer rounded-lg border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800 hover:bg-orange-100"
              >
                {formatCourseName(subjects.get(code)?.name ?? code)}
              </button>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Section>

      <Section title="EQUIVALÊNCIAS">
        {subject.equivalences ? (
          <p className="font-mono text-sm">
            {formatRequirement(subject.equivalences)}
          </p>
        ) : (
          <Empty />
        )}
      </Section>

      <Section title="CO-REQUISITOS">
        {subject.corequisites ? (
          <RequirementView
            expr={subject.corequisites}
            subjects={subjects}
            onSelect={onSelect}
          />
        ) : (
          <Empty />
        )}
      </Section>

      {subject.branches.length > 0 && (
        <Section title="VERTENTES">
          <ul className="flex flex-col gap-1 text-sm">
            {subject.branches.map((link) => (
              <li key={link.key}>
                {branches.get(link.key)?.name ?? link.key} ·{' '}
                <span className="text-muted-foreground">
                  {NATURE_LABELS[link.nature]}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </aside>
  )
}
