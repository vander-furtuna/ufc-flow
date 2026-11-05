'use client'

import type {
  EvaluationCriterion,
  EvaluationCriterionInput,
} from '@ufc-flow/contracts'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilSimpleIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { useId, useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  reorderCriteriaAction,
  saveCriterionAction,
} from '@/lib/evaluation/evaluation-actions'
import { EVALUATION_KEY, useCriteria } from '@/lib/evaluation/use-evaluation'
import { cn } from '@/lib/utils'

import { PageHeader } from '../_components/page-header'

const EMPTY: EvaluationCriterionInput = {
  key: '',
  label: '',
  description: '',
  lowLabel: '',
  highLabel: '',
  isActive: true,
}

const keyOf = (label: string) =>
  label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

function CriterionDialog({
  criterion,
  onClose,
}: {
  // null cria um novo
  criterion: EvaluationCriterion | null
  onClose: () => void
}) {
  const id = useId()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<EvaluationCriterionInput>(
    criterion
      ? { ...criterion, description: criterion.description ?? '' }
      : EMPTY,
  )
  const [keyTouched, setKeyTouched] = useState(Boolean(criterion))
  const [isSaving, startSaving] = useTransition()
  const set = <K extends keyof EvaluationCriterionInput>(
    key: K,
    value: EvaluationCriterionInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    startSaving(async () => {
      const result = await saveCriterionAction(criterion?.id ?? null, form)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível salvar')
        return
      }
      toast.success(criterion ? 'Critério salvo' : 'Critério criado')
      await queryClient.invalidateQueries({ queryKey: EVALUATION_KEY })
      onClose()
    })
  }

  const field = (
    key: 'label' | 'lowLabel' | 'highLabel',
    label: string,
    max: number,
  ) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        required
        maxLength={max}
        value={form[key]}
        onChange={(event) => {
          set(key, event.target.value)
          if (key === 'label' && !keyTouched)
            set('key', keyOf(event.target.value))
        }}
      />
    </div>
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {criterion ? 'Editar critério' : 'Novo critério'}
          </DialogTitle>
          <DialogDescription>
            Notas de 1 a 5, com o que cada ponta significa. Desativar tira o
            critério da tela sem apagar as notas já dadas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {field('label', 'Nome', 60)}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-key`}>Chave</Label>
            <Input
              id={`${id}-key`}
              required
              spellCheck={false}
              autoComplete="off"
              maxLength={40}
              className="font-mono"
              value={form.key}
              onChange={(event) => {
                setKeyTouched(true)
                set('key', event.target.value)
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('lowLabel', 'Nota 1 significa', 30)}
            {field('highLabel', 'Nota 5 significa', 30)}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-description`}>Descrição (opcional)</Label>
            <Input
              id={`${id}-description`}
              maxLength={200}
              value={form.description ?? ''}
              onChange={(event) => set('description', event.target.value)}
            />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(event) => set('isActive', event.target.checked)}
              className="size-4 accent-primary"
            />
            Ativo (aparece na avaliação e nas médias)
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {criterion ? 'Salvar' : 'Criar critério'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Admin › Critérios de avaliação: só admin (a API confere)
export function CriteriaManager() {
  const criteria = useCriteria()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EvaluationCriterion | 'new' | null>(
    null,
  )
  const [isMoving, startMoving] = useTransition()
  const list = criteria.data ?? []

  const move = (index: number, direction: -1 | 1) =>
    startMoving(async () => {
      const ids = list.map((item) => item.id)
      const target = index + direction
      ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
      const result = await reorderCriteriaAction(ids)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível ordenar')
        return
      }
      queryClient.setQueryData([...EVALUATION_KEY, 'criteria'], result.data)
    })

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Critérios de avaliação"
        description="Os critérios que os alunos avaliam de 1 a 5, na ordem em que aparecem. Valem para todas as disciplinas."
        actions={
          <Button onClick={() => setEditing('new')}>
            <PlusIcon aria-hidden className="size-4" />
            Novo critério
          </Button>
        }
      />
      {criteria.isPending ? (
        <div
          aria-hidden
          className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
        />
      ) : criteria.isError ? (
        <p role="alert" className="rounded-2xl border p-6 text-sm">
          {criteria.error.message}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {list.map((criterion, index) => (
            <li
              key={criterion.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl border bg-background p-3 sm:p-4',
                !criterion.isActive && 'border-dashed opacity-70',
              )}
            >
              <span className="w-6 text-center font-clash text-lg font-semibold text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{criterion.label}</span>
                  {!criterion.isActive && (
                    <span className="rounded-full bg-muted px-2 text-[11px] font-semibold text-muted-foreground">
                      Desativado
                    </span>
                  )}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{criterion.key}</span> · 1 ={' '}
                  {criterion.lowLabel} · 5 = {criterion.highLabel}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Subir ${criterion.label}`}
                disabled={index === 0 || isMoving}
                onClick={() => move(index, -1)}
              >
                <ArrowUpIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Descer ${criterion.label}`}
                disabled={index === list.length - 1 || isMoving}
                onClick={() => move(index, 1)}
              >
                <ArrowDownIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Editar ${criterion.label}`}
                onClick={() => setEditing(criterion)}
              >
                <PencilSimpleIcon className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
      )}
      {editing && (
        <CriterionDialog
          criterion={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
