'use client'

import type {
  AddCurriculumSubjectInput,
  NewSubjectInput,
  SubjectType,
  SubjectView,
} from '@ufc-flow/contracts'
import { useState, useTransition, type FormEvent } from 'react'

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
import {
  NATURE_LABELS,
  SUBJECT_TYPE_LABELS,
  type CurriculumNature,
} from '@/data/catalog-labels'
import { findSubjectAction } from '@/lib/catalog/admin-actions'

const NEW_SUBJECT: NewSubjectInput = {
  name: '',
  type: 'DISCIPLINE',
  durationTerms: 1,
  workloadHours: 64,
  theoryHours: 64,
  labHours: 0,
  eadHours: 0,
  extensionHours: 0,
  credits: 4,
}

const WORKLOAD: [keyof NewSubjectInput, string][] = [
  ['workloadHours', 'CH total'],
  ['theoryHours', 'Teórica'],
  ['labHours', 'Laboratório'],
  ['eadHours', 'EaD'],
  ['extensionHours', 'Extensão'],
  ['credits', 'Créditos'],
]

// "+ Disciplina": reaproveita a disciplina do catálogo pelo código ou cria a
// global junto
export function AddSubjectDialog({
  open,
  onOpenChange,
  pending,
  maxPeriods,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  maxPeriods: number
  onAdd: (input: AddCurriculumSubjectInput) => Promise<boolean>
}) {
  const [code, setCode] = useState('')
  const [found, setFound] = useState<SubjectView | null | undefined>(undefined)
  const [subject, setSubject] = useState(NEW_SUBJECT)
  const [semester, setSemester] = useState('1')
  const [nature, setNature] = useState<CurriculumNature>('MANDATORY')
  const [searching, startSearch] = useTransition()

  const reset = () => {
    setCode('')
    setFound(undefined)
    setSubject(NEW_SUBJECT)
  }

  const search = () =>
    startSearch(async () => {
      const result = await findSubjectAction(code)
      setFound(result.ok ? result.data : null)
    })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (found === undefined) return search()
    const ok = await onAdd({
      code: code.trim().toUpperCase(),
      semester: semester === 'none' ? null : Number(semester),
      nature,
      prerequisites: null,
      corequisites: null,
      branches: [],
      subject: found ? null : subject,
    })
    if (ok) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar disciplina</DialogTitle>
          <DialogDescription>
            Requisitos e vertentes se editam depois, no painel da disciplina.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="add-code">Código</Label>
              <Input
                id="add-code"
                required
                spellCheck={false}
                placeholder="ECO0018"
                className="font-mono uppercase"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value)
                  setFound(undefined)
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              isLoading={searching}
              onClick={search}
            >
              Buscar
            </Button>
          </div>

          {found && (
            <p className="rounded-xl bg-muted px-4 py-3 text-sm">
              <span className="font-medium">{found.name}</span> ·{' '}
              {found.workloadHours} h · {found.credits} créditos (já no
              catálogo)
            </p>
          )}
          {found === null && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-sm text-muted-foreground">
                Código novo no catálogo: informe os dados da disciplina.
              </legend>
              <div className="flex flex-col gap-2">
                <Label htmlFor="add-name">Nome</Label>
                <Input
                  id="add-name"
                  required
                  value={subject.name}
                  onChange={(event) =>
                    setSubject((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="add-type">Tipo</Label>
                <Select
                  value={subject.type}
                  onValueChange={(value) =>
                    setSubject((current) => ({
                      ...current,
                      type: value as SubjectType,
                    }))
                  }
                >
                  <SelectTrigger id="add-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUBJECT_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {WORKLOAD.map(([key, label]) => (
                  <div key={key} className="flex flex-col gap-2">
                    <Label htmlFor={`add-${key}`}>{label}</Label>
                    <Input
                      id={`add-${key}`}
                      type="number"
                      min={0}
                      required
                      value={subject[key] as number}
                      onChange={(event) =>
                        setSubject((current) => ({
                          ...current,
                          [key]: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {found !== undefined && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="add-semester">Semestre ideal</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger id="add-semester">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem semestre</SelectItem>
                    {Array.from(
                      { length: Math.max(maxPeriods, 10) },
                      (_, index) => (
                        <SelectItem key={index} value={String(index + 1)}>
                          {index + 1}º período
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="add-nature">Natureza</Label>
                <Select
                  value={nature}
                  onValueChange={(value) =>
                    setNature(value as CurriculumNature)
                  }
                >
                  <SelectTrigger id="add-nature">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(NATURE_LABELS) as CurriculumNature[]).map(
                      (value) => (
                        <SelectItem key={value} value={value}>
                          {NATURE_LABELS[value]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" isLoading={pending || searching}>
              {found === undefined ? 'Continuar' : 'Adicionar à estrutura'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
