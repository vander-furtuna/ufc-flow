'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useSession } from '@/lib/auth/use-session'
import {
  useEvaluationSummary,
  useMyEvaluation,
} from '@/lib/evaluation/use-evaluation'

import { EvaluationForm } from './evaluation-form'
import { EvaluationSummary } from './evaluation-summary'

// Aba Avaliações do painel da disciplina: as médias (públicas) e, para quem
// entrou, a própria avaliação
export function EvaluationPanel({ code }: { code: string }) {
  const pathname = usePathname()
  const { data: user } = useSession()
  const summary = useEvaluationSummary(code)
  const mine = useMyEvaluation(code)

  if (summary.isPending) {
    return (
      <div
        aria-hidden
        className="h-48 animate-pulse rounded-2xl bg-foreground/5 motion-reduce:animate-none"
      />
    )
  }
  if (summary.isError) {
    return (
      <p role="alert" className="rounded-2xl border p-4 text-sm">
        Não foi possível carregar as avaliações agora.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <EvaluationSummary summary={summary.data} />
      {!user ? (
        <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">
          Cursou esta disciplina?{' '}
          <Link
            href={`/entrar?next=${encodeURIComponent(pathname)}`}
            className="font-semibold text-foreground underline underline-offset-2"
          >
            Entre
          </Link>{' '}
          para avaliar. Ninguém vê quem avaliou.
        </p>
      ) : mine.data ? (
        <EvaluationForm
          // Recomeça o formulário ao trocar de disciplina
          key={code}
          code={code}
          criteria={summary.data.criteria}
          mine={mine.data}
        />
      ) : mine.isError ? (
        <p role="alert" className="text-sm">
          Não foi possível carregar a sua avaliação.
        </p>
      ) : null}
    </div>
  )
}
