'use client'

import type { RequirementExpr } from '@ufc-flow/academic-core'
import { XIcon } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addGroup,
  addSubject,
  describeExpr,
  exprFromTree,
  removeNode,
  setKind,
  treeFromExpr,
  type ReqGroup,
} from '@/lib/catalog/requirement-tree'
import { cn } from '@/lib/utils'

type SubjectRef = { code: string; name: string }

// Ids só para as chaves do React
let nodeCounter = 0
const newId = () => `node-${++nodeCounter}`

type Actions = {
  names: ReadonlyMap<string, string>
  datalistId: string
  setKind: (groupId: string, kind: 'and' | 'or') => void
  addSubject: (groupId: string, code: string) => void
  addGroup: (groupId: string) => void
  remove: (nodeId: string) => void
}

const KINDS = [
  ['and', 'TODAS (E)'],
  ['or', 'QUALQUER (OU)'],
] as const

function AddCode({
  datalistId,
  onAdd,
  onCancel,
}: {
  datalistId: string
  onAdd: (code: string) => void
  onCancel: () => void
}) {
  const [code, setCode] = useState('')
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  // Quem clicou em "+ Disciplina" vai digitar o código em seguida
  useEffect(() => input.current?.focus(), [])
  const add = () => {
    if (code.trim()) onAdd(code)
    setCode('')
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    }
    if (event.key === 'Escape') onCancel()
  }
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={inputId} className="sr-only">
        Código da disciplina
      </label>
      <Input
        id={inputId}
        ref={input}
        list={datalistId}
        spellCheck={false}
        placeholder="ECO0018"
        className="h-9 font-mono uppercase"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        onKeyDown={onKey}
      />
      <Button type="button" size="sm" onClick={add}>
        Adicionar
      </Button>
    </div>
  )
}

function Group({
  group,
  isRoot,
  actions,
}: {
  group: ReqGroup
  isRoot: boolean
  actions: Actions
}) {
  const [adding, setAdding] = useState(false)
  const label = group.kind === 'and' ? 'todas' : 'qualquer'
  return (
    <fieldset
      aria-label={`Grupo: ${label}`}
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-xl p-3',
        isRoot
          ? 'border bg-muted/50'
          : 'border border-dashed border-slate-300 dark:border-slate-600',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {KINDS.map(([kind, text]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={group.kind === kind}
              onClick={() => actions.setKind(group.id, kind)}
              className={cn(
                'h-8 rounded-md px-3 text-xs font-semibold text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                group.kind === kind &&
                  'bg-background text-foreground shadow-sm',
              )}
            >
              {text}
            </button>
          ))}
        </div>
        {!isRoot && (
          <button
            type="button"
            aria-label="Tirar grupo"
            onClick={() => actions.remove(group.id)}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      {group.items.map((item) =>
        item.kind === 'subject' ? (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate">
              <span className="font-mono font-medium">{item.code}</span>{' '}
              {actions.names.get(item.code) ?? (
                <em className="text-muted-foreground">fora desta estrutura</em>
              )}
            </span>
            <button
              type="button"
              aria-label={`Tirar ${item.code}`}
              onClick={() => actions.remove(item.id)}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ) : (
          <Group key={item.id} group={item} isRoot={false} actions={actions} />
        ),
      )}

      {adding ? (
        <AddCode
          datalistId={actions.datalistId}
          onAdd={(code) => actions.addSubject(group.id, code)}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
          >
            + Disciplina
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => actions.addGroup(group.id)}
          >
            + Grupo
          </Button>
        </div>
      )}
    </fieldset>
  )
}

// Editor visual de RequirementExpr: grupos TODAS (E) e QUALQUER (OU)
// aninhados, com a expressão em texto embaixo (design system)
export function RequirementEditor({
  label,
  value,
  subjects,
  onChange,
}: {
  label: string
  value: RequirementExpr | null
  subjects: readonly SubjectRef[]
  onChange: (expr: RequirementExpr | null) => void
}) {
  const [tree, setTree] = useState(() => treeFromExpr(value, newId))
  const datalistId = useId()
  const expr = exprFromTree(tree)

  const update = (next: ReqGroup) => {
    setTree(next)
    onChange(exprFromTree(next))
  }

  const actions: Actions = {
    names: new Map(subjects.map((item) => [item.code, item.name])),
    datalistId,
    setKind: (groupId, kind) => update(setKind(tree, groupId, kind)),
    addSubject: (groupId, code) =>
      update(addSubject(tree, groupId, code, newId)),
    addGroup: (groupId) => update(addGroup(tree, groupId, newId)),
    remove: (nodeId) => update(removeNode(tree, nodeId)),
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <Group group={tree} isRoot actions={actions} />
      <p
        data-testid="requirement-preview"
        className="rounded-lg bg-muted px-3 py-2 font-mono text-xs"
      >
        {expr ? describeExpr(expr) : 'Sem requisito'}
      </p>
      <datalist id={datalistId}>
        {subjects.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </datalist>
    </div>
  )
}
