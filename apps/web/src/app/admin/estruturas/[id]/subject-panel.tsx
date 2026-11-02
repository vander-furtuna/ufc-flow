'use client'

import type { RequirementExpr } from '@ufc-flow/academic-core'
import { LockSimpleIcon, XIcon } from '@phosphor-icons/react'
import type {
  CurriculumSubjectInput,
  CurriculumSubjectView,
  ManagedCurriculum,
} from '@ufc-flow/contracts'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NATURE_LABELS, type CurriculumNature } from '@/data/catalog-labels'
import { cn } from '@/lib/utils'

import { BranchDot } from '../../_components/page-header'
import { RequirementEditor } from './requirement-editor'

const NO_SEMESTER = 'none'
const UNLINKED = 'none'

// Painel lateral do Admin-EC: semestre, natureza, pré e co-requisitos e
// vertentes de uma disciplina, salvos de uma vez
export function SubjectPanel({
  subject,
  managed,
  pending,
  onSave,
  onRemove,
  onClose,
  closable = true,
}: {
  closable?: boolean
  subject: CurriculumSubjectView
  managed: ManagedCurriculum
  pending: boolean
  onSave: (input: CurriculumSubjectInput) => void
  onRemove: () => void
  onClose: () => void
}) {
  const [semester, setSemester] = useState(subject.semester)
  const [nature, setNature] = useState<CurriculumNature>(subject.nature)
  const [prerequisites, setPrerequisites] = useState<RequirementExpr | null>(
    subject.prerequisites,
  )
  const [corequisites, setCorequisites] = useState<RequirementExpr | null>(
    subject.corequisites,
  )
  const [links, setLinks] = useState(
    () => new Map(subject.branches.map((link) => [link.branchId, link.nature])),
  )
  const periods = Math.max(managed.header.maxPeriods, subject.semester ?? 0, 10)
  const others = managed.subjects
    .filter((item) => item.code !== subject.code)
    .map(({ code, name }) => ({ code, name }))

  const save = () =>
    onSave({
      semester,
      nature,
      prerequisites,
      corequisites,
      branches: [...links].map(([branchId, linkNature]) => ({
        branchId,
        nature: linkNature,
      })),
    })

  return (
    <section
      aria-labelledby="subject-panel-title"
      className="flex flex-col gap-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">
            {subject.code} · {subject.workloadHours} h · {subject.credits}{' '}
            créditos
          </p>
          <h2
            id="subject-panel-title"
            className="font-clash text-xl font-semibold"
          >
            {subject.name}
          </h2>
        </div>
        {closable && (
          <button
            type="button"
            aria-label="Fechar painel da disciplina"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-5" />
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="panel-semester">Semestre ideal</Label>
          <Select
            value={semester === null ? NO_SEMESTER : String(semester)}
            onValueChange={(value) =>
              setSemester(value === NO_SEMESTER ? null : Number(value))
            }
          >
            <SelectTrigger id="panel-semester">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SEMESTER}>Sem semestre</SelectItem>
              {Array.from({ length: periods }, (_, index) => (
                <SelectItem key={index} value={String(index + 1)}>
                  {index + 1}º período
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="panel-nature">Natureza</Label>
          <Select
            value={nature}
            onValueChange={(value) => setNature(value as CurriculumNature)}
          >
            <SelectTrigger id="panel-nature">
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

      <RequirementEditor
        label="Pré-requisitos"
        value={prerequisites}
        subjects={others}
        onChange={setPrerequisites}
      />
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium">
          Co-requisitos
          {corequisites ? '' : ' (nenhum)'}
        </summary>
        <div className="mt-3">
          <RequirementEditor
            label="Co-requisitos"
            value={corequisites}
            subjects={others}
            onChange={setCorequisites}
          />
        </div>
      </details>

      {managed.branches.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Vertentes</p>
          <ul className="flex flex-col gap-2">
            {managed.branches.map((branch) => {
              const linkNature = links.get(branch.id)
              return (
                <li
                  key={branch.id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border px-3 py-2',
                    linkNature &&
                      'border-cyan-300 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-500/10',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <BranchDot color={branch.color} />
                    <span className="truncate">{branch.name}</span>
                  </span>
                  <Select
                    value={linkNature ?? UNLINKED}
                    onValueChange={(value) =>
                      setLinks((current) => {
                        const next = new Map(current)
                        if (value === UNLINKED) next.delete(branch.id)
                        else next.set(branch.id, value as CurriculumNature)
                        return next
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Vínculo com ${branch.name}`}
                      className="h-8 w-36 text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNLINKED}>não vinculada</SelectItem>
                      <SelectItem value="MANDATORY">Obrigatória</SelectItem>
                      <SelectItem value="OPTATIVE">Optativa</SelectItem>
                    </SelectContent>
                  </Select>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="flex gap-2 text-xs text-muted-foreground">
        <LockSimpleIcon className="mt-0.5 size-4 shrink-0" />
        {managed.locked
          ? 'Já há matrícula nesta estrutura: natureza, remoção e vínculos com vertentes estão bloqueados. Semestre ideal e requisitos continuam editáveis, com registro de auditoria.'
          : 'Depois da primeira matrícula nesta estrutura, natureza e vertentes ficam bloqueadas. Semestre ideal e requisitos continuam editáveis, com registro de auditoria.'}
      </p>

      <div className="flex flex-col gap-2">
        <Button className="h-11" isLoading={pending} onClick={save}>
          Salvar alterações
        </Button>
        <Button
          variant="ghost"
          className="text-red-700 hover:text-red-800 dark:text-red-400"
          disabled={pending || managed.locked}
          onClick={onRemove}
        >
          Tirar da estrutura
        </Button>
      </div>
    </section>
  )
}
