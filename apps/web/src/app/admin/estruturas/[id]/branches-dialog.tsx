'use client'

import type {
  BranchInput,
  BranchView,
  ManagedCurriculum,
} from '@ufc-flow/contracts'
import { useState, type FormEvent } from 'react'

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BRANCH_TYPE_LABELS } from '@/data/catalog-labels'

import { BranchDot } from '../../_components/page-header'

const NO_PARENT = 'none'

const EMPTY: BranchInput = {
  parentId: null,
  type: 'SLOPE',
  name: '',
  description: null,
  sigaaCode: null,
  color: '#22d3ee',
  mandatoryHours: null,
  minHours: null,
  maxHours: null,
  minComponents: null,
  maxComponents: null,
}

const LIMITS: [keyof BranchInput, string][] = [
  ['mandatoryHours', 'CH obrigatória'],
  ['minHours', 'CH mínima'],
  ['maxHours', 'CH máxima'],
  ['minComponents', 'Componentes mínimos'],
  ['maxComponents', 'Componentes máximos'],
]

const toInput = ({ id: _, position: __, ...branch }: BranchView): BranchInput =>
  branch

function BranchForm({
  initial,
  emphases,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: BranchInput
  emphases: BranchView[]
  submitLabel: string
  pending: boolean
  onSubmit: (input: BranchInput) => void
  onCancel?: () => void
}) {
  const [branch, setBranch] = useState(initial)
  const set = <K extends keyof BranchInput>(key: K, value: BranchInput[K]) =>
    setBranch((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(branch)
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="branch-name">Nome</Label>
          <Input
            id="branch-name"
            required
            value={branch.name}
            onChange={(event) => set('name', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="branch-color">Cor</Label>
          <Input
            id="branch-color"
            type="color"
            className="h-10 w-16 p-1"
            value={branch.color ?? '#94a3b8'}
            onChange={(event) => set('color', event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="branch-type">Tipo</Label>
          <Select
            value={branch.type}
            onValueChange={(value) => {
              set('type', value as BranchInput['type'])
              if (value !== 'SPECIFIC_GROUP') set('parentId', null)
            }}
          >
            <SelectTrigger id="branch-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BRANCH_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {branch.type === 'SPECIFIC_GROUP' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="branch-parent">Dentro da ênfase</Label>
            <Select
              value={branch.parentId ?? NO_PARENT}
              onValueChange={(value) =>
                set('parentId', value === NO_PARENT ? null : value)
              }
            >
              <SelectTrigger id="branch-parent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>Nenhuma</SelectItem>
                {emphases.map((emphasis) => (
                  <SelectItem key={emphasis.id} value={emphasis.id}>
                    {emphasis.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="branch-description">Descrição</Label>
        <Input
          id="branch-description"
          value={branch.description ?? ''}
          onChange={(event) => set('description', event.target.value || null)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LIMITS.map(([key, label]) => (
          <div key={key} className="flex flex-col gap-2">
            <Label htmlFor={`branch-${key}`}>{label}</Label>
            <Input
              id={`branch-${key}`}
              type="number"
              min={0}
              inputMode="numeric"
              value={(branch[key] as number | null) ?? ''}
              onChange={(event) =>
                set(
                  key,
                  event.target.value === '' ? null : Number(event.target.value),
                )
              }
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" isLoading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

// "Vertentes" do Admin-EC: criar, editar, remover e entrar no modo de
// vínculo em lote
export function BranchesDialog({
  open,
  onOpenChange,
  managed,
  pending,
  onCreate,
  onUpdate,
  onRemove,
  onLink,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  managed: ManagedCurriculum
  pending: boolean
  onCreate: (input: BranchInput) => Promise<boolean>
  onUpdate: (branchId: string, input: BranchInput) => Promise<boolean>
  onRemove: (branchId: string) => void
  onLink: (branchId: string) => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const emphases = managed.branches.filter(
    (branch) => branch.type === 'EMPHASIS',
  )
  const linked = (branchId: string) =>
    managed.subjects.filter((subject) =>
      subject.branches.some((link) => link.branchId === branchId),
    ).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vertentes</DialogTitle>
          <DialogDescription>
            Ênfases e grupos vêm do SIGAA; vertentes são criadas no Flow. Depois
            da primeira matrícula, tipo, vertente-mãe e limites travam.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-3">
          {managed.branches.map((branch) =>
            editing === branch.id ? (
              <li key={branch.id}>
                <BranchForm
                  initial={toInput(branch)}
                  emphases={emphases.filter((item) => item.id !== branch.id)}
                  submitLabel="Salvar vertente"
                  pending={pending}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (input) => {
                    if (await onUpdate(branch.id, input)) setEditing(null)
                  }}
                />
              </li>
            ) : (
              <li
                key={branch.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <BranchDot color={branch.color} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {branch.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {BRANCH_TYPE_LABELS[branch.type]}
                      {branch.sigaaCode ? ` · ${branch.sigaaCode}` : ''} ·{' '}
                      {linked(branch.id)} disciplinas
                    </span>
                  </span>
                </span>
                <span className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLink(branch.id)}
                  >
                    Vincular em lote
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(branch.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-700 dark:text-red-400"
                    disabled={pending || managed.locked}
                    onClick={() => onRemove(branch.id)}
                  >
                    Remover
                  </Button>
                </span>
              </li>
            ),
          )}
        </ul>
        {creating ? (
          <BranchForm
            initial={EMPTY}
            emphases={emphases}
            submitLabel="Criar vertente"
            pending={pending}
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              if (await onCreate(input)) setCreating(false)
            }}
          />
        ) : (
          <Button variant="outline" onClick={() => setCreating(true)}>
            + Nova vertente
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
