import type { ProblemDetails } from '@ufc-flow/contracts'
import type { ReactNode } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { cn } from '@/lib/utils'

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-red-700 dark:text-red-400">
      {message}
    </p>
  )
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-[12px] bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {message}
    </p>
  )
}

export function InfoNote({
  id,
  children,
  className,
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <p
      id={id}
      className={cn(
        'rounded-[12px] bg-muted px-4 py-3 text-sm text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  )
}

// Erros de campo da API (VALIDATION_FAILED) vão para os campos; o resto vira
// a mensagem geral do formulário
export function applyProblem<T extends FieldValues>(
  problem: Pick<ProblemDetails, 'code' | 'detail' | 'errors'>,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): string | null {
  let shown = false
  for (const error of problem.errors ?? []) {
    const field = error.path[0]
    if (typeof field === 'string' && fields.includes(field as Path<T>)) {
      setError(field as Path<T>, { message: error.message })
      shown = true
    }
  }
  if (shown) return null
  return problem.detail ?? 'Não foi possível concluir. Tente de novo.'
}

// Só caminhos internos, para o ?next= não virar redirecionamento aberto
export function safeNext(
  next: string | null | undefined,
  fallback = '/cursos',
) {
  return next &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.includes('\\')
    ? next
    : fallback
}
