import { Chip } from '../components/ui'
import { formatCourseName } from '../sigaa/course'
import { BRANCH_TYPE_LABELS, NATURE_LABELS } from '../sigaa/labels'
import type { Branch, Subject } from './types'

const limit = (value: number | null, unit: string) =>
  value === null ? '—' : `${value}${unit}`

// Ênfases e grupos como o SIGAA mostra, com os limites e as disciplinas
export function BranchesTab({
  branches,
  subjects,
}: {
  branches: readonly Branch[]
  subjects: readonly Subject[]
}) {
  if (branches.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-sm">
        A página do SIGAA não traz ênfases nem grupos de componentes para esta
        estrutura.
      </p>
    )
  }

  const names = new Map(branches.map((item) => [item.key, item.name]))
  return (
    <div className="grid flex-1 auto-rows-min gap-4 overflow-y-auto p-6 lg:grid-cols-2">
      {branches.map((branch) => {
        const members = subjects.flatMap((subject) =>
          subject.branches
            .filter((link) => link.key === branch.key)
            .map((link) => ({ subject, nature: link.nature })),
        )
        const limits = [
          ['CH obrigatória', limit(branch.mandatoryHours, 'h')],
          [
            branch.type === 'EMPHASIS' ? 'CH optativa mínima' : 'CH mínima',
            limit(branch.minHours, 'h'),
          ],
          ['CH máxima', limit(branch.maxHours, 'h')],
          ['Componentes mín.', limit(branch.minComponents, '')],
          ['Componentes máx.', limit(branch.maxComponents, '')],
        ].filter(([, value]) => value !== '—')

        return (
          <article
            key={branch.key}
            className="border-border flex flex-col gap-3 rounded-2xl border p-4"
          >
            <header className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-1.5">
                <Chip>{BRANCH_TYPE_LABELS[branch.type]}</Chip>
                {branch.sigaaCode && <Chip mono>{branch.sigaaCode}</Chip>}
              </div>
              <h3 className="font-clash text-base font-semibold">
                {branch.name}
              </h3>
              {branch.parentKey && (
                <p className="text-muted-foreground text-xs">
                  Dentro de {names.get(branch.parentKey)}
                </p>
              )}
            </header>
            {limits.length > 0 && (
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {limits.map(([label, value]) => (
                  <div key={label} className="flex gap-1">
                    <dt className="text-muted-foreground">{label}:</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <ul className="flex flex-col gap-1 text-sm">
              {members.map(({ subject, nature }) => (
                <li key={subject.code} className="flex gap-2">
                  <span className="text-muted-foreground font-mono text-xs">
                    {subject.code}
                  </span>
                  <span className="flex-1">
                    {formatCourseName(subject.name)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {NATURE_LABELS[nature]}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        )
      })}
    </div>
  )
}
