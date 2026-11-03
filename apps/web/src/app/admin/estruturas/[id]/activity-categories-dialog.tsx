'use client'

import type {
  ActivityCategoryInput,
  ActivityCategoryView,
} from '@ufc-flow/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ACTIVITY_KIND_LABELS } from '@/components/academic/activity-dialog'
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
  deleteCategoryAction,
  listCategoriesAction,
  saveCategoryAction,
  type ActivityResult,
} from '@/lib/academic-record/activity-actions'

const EMPTY: ActivityCategoryInput = {
  kind: 'COMPLEMENTARY',
  name: '',
  maxHours: null,
  position: 0,
}

const unwrap = <T,>(result: ActivityResult<T>): T => {
  if (!result.ok)
    throw new Error(result.problem.detail ?? 'Não foi possível salvar.')
  return result.data
}

const toInput = ({ id: _, ...category }: ActivityCategoryView) => category

function CategoryForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: ActivityCategoryInput
  submitLabel: string
  pending: boolean
  onSubmit: (input: ActivityCategoryInput) => void
  onCancel?: () => void
}) {
  const [category, setCategory] = useState(initial)
  const set = <K extends keyof ActivityCategoryInput>(
    key: K,
    value: ActivityCategoryInput[K],
  ) => setCategory((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(category)
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-name">Nome</Label>
          <Input
            id="category-name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Ex.: Monitoria"
            value={category.name}
            onChange={(event) => set('name', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-kind">Tipo</Label>
          <select
            id="category-kind"
            value={category.kind}
            onChange={(event) =>
              set('kind', event.target.value as ActivityCategoryInput['kind'])
            }
            className="h-10 rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {Object.entries(ACTIVITY_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-max">Teto de horas</Label>
          <Input
            id="category-max"
            type="number"
            min={1}
            max={2000}
            inputMode="numeric"
            placeholder="Sem teto"
            value={category.maxHours ?? ''}
            onChange={(event) =>
              set(
                'maxHours',
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-position">Ordem</Label>
          <Input
            id="category-position"
            type="number"
            min={0}
            inputMode="numeric"
            value={category.position}
            onChange={(event) => set('position', Number(event.target.value))}
          />
        </div>
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

// Categorias de atividades complementares e de extensão da EC, com o teto de
// horas do regulamento do curso
export function ActivityCategoriesDialog({
  open,
  onOpenChange,
  curriculumId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  curriculumId: string
}) {
  const queryClient = useQueryClient()
  const key = ['admin', 'activity-categories', curriculumId]
  const { data: categories = [], isPending } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await listCategoriesAction(curriculumId)),
    enabled: open,
  })
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const done = (message: string) => {
    toast.success(message)
    setEditing(null)
    setAdding(false)
    return queryClient.invalidateQueries({ queryKey: key })
  }
  const save = useMutation({
    mutationFn: async (input: {
      categoryId?: string
      category: ActivityCategoryInput
    }) =>
      unwrap(
        await saveCategoryAction(
          input.categoryId
            ? { categoryId: input.categoryId }
            : { curriculumId },
          input.category,
        ),
      ),
    onSuccess: (_, input) =>
      done(input.categoryId ? 'Categoria salva' : 'Categoria criada'),
    onError: (error) => toast.error(error.message),
  })
  const remove = useMutation({
    mutationFn: async (categoryId: string) =>
      unwrap(await deleteCategoryAction(categoryId)),
    onSuccess: () => done('Categoria removida'),
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Categorias de atividades</DialogTitle>
          <DialogDescription>
            Conforme o regulamento do curso. Com teto, as horas de uma categoria
            só contam até ele; sem categoria, a atividade não tem teto.
          </DialogDescription>
        </DialogHeader>
        {isPending ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {categories.length === 0 && !adding && (
              <li className="text-sm text-muted-foreground">
                Nenhuma categoria nesta estrutura.
              </li>
            )}
            {categories.map((category) =>
              editing === category.id ? (
                <li key={category.id}>
                  <CategoryForm
                    initial={toInput(category)}
                    submitLabel="Salvar"
                    pending={save.isPending}
                    onSubmit={(input) =>
                      save.mutate({ categoryId: category.id, category: input })
                    }
                    onCancel={() => setEditing(null)}
                  />
                </li>
              ) : (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {category.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ACTIVITY_KIND_LABELS[category.kind]} ·{' '}
                      {category.maxHours
                        ? `até ${category.maxHours} h`
                        : 'sem teto'}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(category.id)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            'Remover esta categoria? As atividades dela ficam sem categoria.',
                          )
                        ) {
                          remove.mutate(category.id)
                        }
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
        {adding ? (
          <CategoryForm
            initial={{ ...EMPTY, position: categories.length }}
            submitLabel="Criar categoria"
            pending={save.isPending}
            onSubmit={(input) => save.mutate({ category: input })}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => setAdding(true)}
          >
            + Categoria
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
