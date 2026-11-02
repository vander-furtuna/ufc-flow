'use client'

import type { AcademicTerm, CourseDetail, ScrapeRun } from '@ufc-flow/contracts'
import { useState, useTransition, type FormEvent } from 'react'
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
  collectSectionsAction,
  createTermAction,
  deleteTermAction,
  makeCurrentTermAction,
  updateTermAction,
} from '@/lib/catalog/admin-actions'

import { Chip } from '../_components/page-header'

const formatDate = (iso: string) => iso.split('-').reverse().join('/')

const byCodeDesc = (a: AcademicTerm, b: AcademicTerm) =>
  b.code.localeCompare(a.code)

function TermForm({
  term,
  onSaved,
}: {
  term: AcademicTerm | null
  onSaved: (term: AcademicTerm) => void
}) {
  const [code, setCode] = useState(term?.code ?? '')
  const [startsAt, setStartsAt] = useState(term?.startsAt ?? '')
  const [endsAt, setEndsAt] = useState(term?.endsAt ?? '')
  const [pending, startTransition] = useTransition()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      const result = term
        ? await updateTermAction(term.code, { startsAt, endsAt })
        : await createTermAction({ code, startsAt, endsAt })
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível salvar')
        return
      }
      toast.success(term ? 'Datas atualizadas' : 'Semestre cadastrado')
      onSaved(result.data)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="term-code">Semestre</Label>
        <Input
          id="term-code"
          required
          placeholder="2027.1"
          pattern="\d{4}\.[12]"
          inputMode="decimal"
          disabled={term !== null}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="w-32 font-mono"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="term-start">Início das aulas</Label>
          <Input
            id="term-start"
            type="date"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="term-end">Fim das aulas</Label>
          <Input
            id="term-end"
            type="date"
            required
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        O semestre seguinte também é coletado a partir de 45 dias antes do
        início, para a matrícula.
      </p>
      <div className="flex justify-end">
        <Button type="submit" isLoading={pending}>
          {term ? 'Salvar datas' : 'Cadastrar semestre'}
        </Button>
      </div>
    </form>
  )
}

function CollectionResult({ run }: { run: ScrapeRun }) {
  if (run.status === 'FAILED') {
    return (
      <span className="text-xs text-red-700 dark:text-red-400">
        Falhou: {run.error}
      </span>
    )
  }
  return (
    <span className="text-xs text-muted-foreground">
      {run.sectionsSeen} turmas, {run.sectionsChanged} novas ou alteradas
    </span>
  )
}

function Collection({
  term,
  courses,
}: {
  term: AcademicTerm
  courses: CourseDetail[]
}) {
  const [runs, setRuns] = useState<Record<string, ScrapeRun>>({})
  const [running, setRunning] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const collect = (course: CourseDetail) => {
    setRunning(course.slug)
    startTransition(async () => {
      const result = await collectSectionsAction(term.code, course.slug)
      setRunning(null)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível coletar')
        return
      }
      setRuns((current) => ({ ...current, [course.slug]: result.data }))
      if (result.data.status === 'FAILED') {
        toast.error(`O SIGAA não respondeu para ${course.name}`)
      } else {
        toast.success(`Turmas de ${course.name} atualizadas`)
      }
    })
  }

  return (
    <section aria-labelledby="collection-title" className="flex flex-col gap-3">
      <h2 id="collection-title" className="font-clash text-xl font-semibold">
        Coleta de turmas · {term.code}
      </h2>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum curso ativo para coletar.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border bg-background">
          {courses.map((course) => (
            <li
              key={course.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{course.name}</span>
                {runs[course.slug] ? (
                  <CollectionResult run={runs[course.slug]!} />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    SIGAA {course.sigaaId}
                  </span>
                )}
              </span>
              <Button
                size="sm"
                variant="outline"
                isLoading={running === course.slug}
                disabled={running !== null}
                onClick={() => collect(course)}
              >
                Coletar agora
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function TermsManager({
  initialTerms,
  courses,
  isAdmin,
}: {
  initialTerms: AcademicTerm[]
  courses: CourseDetail[]
  isAdmin: boolean
}) {
  const [terms, setTerms] = useState(initialTerms)
  // null: fechado; 'new': cadastro; um semestre: edição das datas
  const [editing, setEditing] = useState<AcademicTerm | 'new' | null>(null)
  const [pending, startTransition] = useTransition()
  const current = terms.find((term) => term.isCurrent) ?? null

  const save = (saved: AcademicTerm) => {
    setTerms((list) =>
      [...list.filter((term) => term.id !== saved.id), saved].sort(byCodeDesc),
    )
    setEditing(null)
  }

  const makeCurrent = (term: AcademicTerm) =>
    startTransition(async () => {
      const result = await makeCurrentTermAction(term.code)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível marcar')
        return
      }
      setTerms((list) =>
        list.map((item) => ({ ...item, isCurrent: item.id === term.id })),
      )
      toast.success(`${term.code} é o semestre vigente`)
    })

  const remove = (term: AcademicTerm) => {
    if (!window.confirm(`Excluir o semestre ${term.code}?`)) return
    startTransition(async () => {
      const result = await deleteTermAction(term.code)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível excluir')
        return
      }
      setTerms((list) => list.filter((item) => item.id !== term.id))
    })
  }

  return (
    <>
      <section aria-labelledby="terms-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="terms-title" className="font-clash text-xl font-semibold">
            Semestres letivos
          </h2>
          {isAdmin && (
            <Button onClick={() => setEditing('new')}>+ Novo semestre</Button>
          )}
        </div>
        {terms.length === 0 ? (
          <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">
            Nenhum semestre cadastrado. Até cadastrar e marcar o vigente, o site
            usa o semestre das variáveis de ambiente.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-2xl border bg-background">
            {terms.map((term) => (
              <li
                key={term.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono font-medium">
                    {term.code}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(term.startsAt)} a {formatDate(term.endsAt)}
                  </span>
                </span>
                {term.isCurrent && (
                  <Chip className="bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                    Vigente
                  </Chip>
                )}
                {isAdmin && (
                  <>
                    {!term.isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => makeCurrent(term)}
                      >
                        Marcar como vigente
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setEditing(term)}
                    >
                      Editar datas
                    </Button>
                    {!term.isCurrent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-700 dark:text-red-400"
                        disabled={pending}
                        onClick={() => remove(term)}
                      >
                        Excluir
                      </Button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {current && <Collection term={current} courses={courses} />}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing === 'new' || editing === null
                ? 'Novo semestre'
                : `Semestre ${editing.code}`}
            </DialogTitle>
            <DialogDescription>
              As datas são as do calendário acadêmico da UFC.
            </DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <TermForm
              key={editing === 'new' ? 'new' : editing.id}
              term={editing === 'new' ? null : editing}
              onSaved={save}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
