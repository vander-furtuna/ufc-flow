'use client'

import type {
  MyEvaluation,
  SubjectEvaluationSummary,
} from '@ufc-flow/contracts'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { saveEvaluationAction } from '@/lib/evaluation/evaluation-actions'
import { EVALUATION_KEY } from '@/lib/evaluation/use-evaluation'
import { cn } from '@/lib/utils'

const STATUS = { APROVADO: 'Aprovado', REPROVADO: 'Reprovado' } as const

const card = 'flex flex-col gap-3 rounded-2xl border bg-background p-4'
const title = 'font-clash text-sm font-semibold tracking-wide uppercase'

// "Sua avaliação" (mockup Disciplina-Avaliacao): uma nota de 1 a 5 para cada
// critério, com os rótulos das pontas; enviar de novo edita
export function EvaluationForm({
  code,
  criteria,
  mine,
}: {
  code: string
  criteria: SubjectEvaluationSummary['criteria']
  mine: MyEvaluation
}) {
  const queryClient = useQueryClient()
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      mine.scores.map((item) => [item.criterionId, item.score]),
    ),
  )
  const [isSaving, startSaving] = useTransition()
  const answered = criteria.filter((item) => scores[item.id]).length
  const complete = answered === criteria.length
  const { eligibility } = mine

  if (!eligibility.eligible) {
    return (
      <section className={card}>
        <h3 className={title}>Sua avaliação</h3>
        <p className="text-sm text-muted-foreground">
          {eligibility.status && eligibility.requiresInstitutionalEmail
            ? 'Avaliar exige uma conta com e-mail @alu.ufc.br.'
            : 'Só avalia quem foi aprovado ou reprovado na disciplina. Registre a situação no seu histórico para liberar.'}
        </p>
        {!eligibility.status && (
          <Link
            href="/minha-area/historico"
            className="text-sm font-semibold underline underline-offset-2"
          >
            Abrir o histórico
          </Link>
        )}
      </section>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!complete) return
    startSaving(async () => {
      const result = await saveEvaluationAction(code, {
        scores: criteria.map((item) => ({
          criterionId: item.id,
          score: scores[item.id]!,
        })),
      })
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível salvar')
        return
      }
      toast.success('Avaliação salva. Obrigado!')
      queryClient.setQueryData([...EVALUATION_KEY, 'mine', code], result.data)
      await queryClient.invalidateQueries({
        queryKey: [...EVALUATION_KEY, 'summary', code],
      })
    })
  }

  return (
    <form onSubmit={submit} className={card}>
      <div className="flex flex-col gap-0.5">
        <h3 className={title}>Sua avaliação</h3>
        <p className="text-xs text-muted-foreground">
          Liberada pelo seu histórico:{' '}
          {eligibility.status ? STATUS[eligibility.status] : ''}
          {eligibility.term ? ` em ${eligibility.term}` : ''}. Ninguém vê quem
          avaliou.
        </p>
      </div>
      {criteria.map((criterion) => (
        <fieldset key={criterion.id} className="flex min-w-0 flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">
            {criterion.label}
          </legend>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => {
              const on = scores[criterion.id] === value
              return (
                <label
                  key={value}
                  className={cn(
                    'flex h-10 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                    on
                      ? 'border-2 border-orange-400 bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200'
                      : 'border bg-muted/50 text-muted-foreground hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name={`score-${criterion.id}`}
                    value={value}
                    checked={on}
                    onChange={() =>
                      setScores((current) => ({
                        ...current,
                        [criterion.id]: value,
                      }))
                    }
                    className="sr-only"
                  />
                  {value}
                  <span className="sr-only">
                    {value === 1
                      ? ` (${criterion.lowLabel})`
                      : value === 5
                        ? ` (${criterion.highLabel})`
                        : ''}
                  </span>
                </label>
              )
            })}
          </div>
          <div
            aria-hidden
            className="flex justify-between text-[11px] text-muted-foreground"
          >
            <span>{criterion.lowLabel}</span>
            <span>{criterion.highLabel}</span>
          </div>
        </fieldset>
      ))}
      <Button
        type="submit"
        disabled={!complete}
        isLoading={isSaving}
        className="h-11"
      >
        {mine.updatedAt ? 'Atualizar avaliação' : 'Enviar avaliação'}
        {complete ? '' : ` (${answered} de ${criteria.length})`}
      </Button>
    </form>
  )
}
