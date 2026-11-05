'use client'

import {
  EVALUATION_MIN_RESPONSES,
  type SubjectEvaluationSummary,
} from '@ufc-flow/contracts'
import { CaretDownIcon } from '@phosphor-icons/react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

type CriterionSummary = SubjectEvaluationSummary['criteria'][number]

function Criterion({ criterion }: { criterion: CriterionSummary }) {
  const [open, setOpen] = useState(false)
  const { mean, distribution, count } = criterion
  if (mean === null || distribution === null || count === null) return null
  const max = Math.max(1, ...distribution)
  return (
    <li className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-baseline justify-between gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="text-sm font-medium">{criterion.label}</span>
        <span className="flex items-center gap-1">
          <span className="font-clash text-lg font-semibold tabular-nums">
            {decimal.format(mean)}
          </span>
          <CaretDownIcon
            aria-hidden
            className={cn(
              'size-3.5 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
          <span className="sr-only">
            {open ? 'Esconder a distribuição' : 'Ver a distribuição'}
          </span>
        </span>
      </button>
      {/* A média já está no texto ao lado; a barra é só visual */}
      <div
        aria-hidden
        className="h-2 overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-orange-400 to-orange-500"
          style={{ width: `${(mean / 5) * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>1 · {criterion.lowLabel}</span>
        <span>{criterion.highLabel} · 5</span>
      </div>
      {open && (
        <ol
          aria-label={`Distribuição das notas de ${criterion.label}`}
          className="flex flex-col gap-1 pt-1"
        >
          {distribution.map((value, index) => (
            <li key={index} className="flex items-center gap-2 text-xs">
              <span className="w-3 tabular-nums">{index + 1}</span>
              <span
                aria-hidden
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10"
              >
                <span
                  className="block h-full rounded-full bg-orange-400"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </span>
              <span className="w-6 text-right text-muted-foreground tabular-nums">
                {value}
              </span>
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

// "Médias" do painel da disciplina (mockup Disciplina-Avaliacao). Abaixo do
// mínimo, só os critérios e o aviso, sem números.
export function EvaluationSummary({
  summary,
}: {
  summary: SubjectEvaluationSummary
}) {
  return (
    <section aria-labelledby="evaluation-means" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3
          id="evaluation-means"
          className="font-clash text-sm font-semibold tracking-wide uppercase"
        >
          Médias
        </h3>
        {summary.total !== null && (
          <span className="text-xs text-muted-foreground">
            {summary.total}{' '}
            {summary.total === 1 ? 'avaliação anônima' : 'avaliações anônimas'}
          </span>
        )}
      </div>
      <div className="rounded-2xl border bg-background p-4">
        {summary.enough ? (
          <ul className="flex flex-col gap-4">
            {summary.criteria.map((criterion) => (
              <Criterion key={criterion.id} criterion={criterion} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            As médias aparecem a partir de {EVALUATION_MIN_RESPONSES}{' '}
            avaliações, para ninguém ser identificado.
          </p>
        )}
        {summary.enough &&
          summary.criteria.some((criterion) => criterion.mean === null) && (
            <p className="mt-3 text-xs text-muted-foreground">
              Critérios novos aparecem quando tiverem {EVALUATION_MIN_RESPONSES}{' '}
              respostas.
            </p>
          )}
      </div>
    </section>
  )
}
