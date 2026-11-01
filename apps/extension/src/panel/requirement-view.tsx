import type { RequirementExpr } from '@ufc-flow/academic-core'

import { formatCourseName } from '../sigaa/course'
import type { Subject } from './types'

// Árvore de E/OU legível: cada grupo vira uma caixa com "TODAS (E)" ou
// "QUALQUER UMA (OU)", e códigos fora da EC aparecem marcados
export function RequirementView({
  expr,
  subjects,
  onSelect,
}: {
  expr: RequirementExpr
  subjects: ReadonlyMap<string, Subject>
  onSelect: (code: string) => void
}) {
  if (expr.kind === 'subject') {
    const subject = subjects.get(expr.code)
    return (
      <button
        type="button"
        disabled={!subject}
        onClick={() => onSelect(expr.code)}
        className="bg-background flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm disabled:cursor-default"
      >
        <span className="font-mono text-xs font-medium">{expr.code}</span>
        {subject ? (
          <span>{formatCourseName(subject.name)}</span>
        ) : (
          <span className="text-muted-foreground">fora desta estrutura</span>
        )}
      </button>
    )
  }

  const isOr = expr.kind === 'or'
  return (
    <div
      className={
        isOr
          ? 'rounded-xl border border-cyan-200 bg-cyan-50 p-2'
          : 'border-border bg-muted rounded-xl border p-2'
      }
    >
      <p
        className={
          isOr
            ? 'px-1 pb-1.5 text-xs font-semibold tracking-wide text-cyan-800'
            : 'text-muted-foreground px-1 pb-1.5 text-xs font-semibold tracking-wide'
        }
      >
        {isOr ? 'QUALQUER UMA (OU)' : 'TODAS (E)'}
      </p>
      <div className="flex flex-col gap-1.5">
        {expr.items.map((item, index) => (
          <RequirementView
            // A árvore normalizada não repete itens: a posição é estável
            // oxlint-disable-next-line react/no-array-index-key
            key={index}
            expr={item}
            subjects={subjects}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
