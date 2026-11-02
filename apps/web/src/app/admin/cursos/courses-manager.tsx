'use client'

import { normalizeSearchText } from '@ufc-flow/academic-core'
import type { CourseDetail, SigaaCourseEntry } from '@ufc-flow/contracts'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import {
  COURSE_ICON_NAMES,
  CourseDynamicIcon,
} from '@/components/course-dynamic-icon'
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
  createCourseAction,
  deleteCourseAction,
  refreshSigaaCatalogAction,
  updateCourseAction,
} from '@/lib/catalog/admin-actions'
import { cn } from '@/lib/utils'

import { Chip } from '../_components/page-header'

const slugify = (text: string) =>
  normalizeSearchText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const LOWER = new Set(['da', 'das', 'de', 'do', 'dos', 'e', 'em'])
const titleCase = (text: string) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && LOWER.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')

function NewCourse({
  catalog,
  preselected,
  onCreated,
}: {
  catalog: SigaaCourseEntry[]
  preselected: SigaaCourseEntry | null
  onCreated: (course: CourseDetail) => void
}) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<SigaaCourseEntry | null>(preselected)
  const [name, setName] = useState(
    preselected ? titleCase(preselected.sigaaCourse.name) : '',
  )
  const [slug, setSlug] = useState(
    preselected ? slugify(preselected.sigaaCourse.name) : '',
  )
  const [icon, setIcon] = useState('books')
  const [pending, startTransition] = useTransition()
  const search = normalizeSearchText(query.trim())
  const options = catalog
    .filter((entry) => entry.flowCourseId === null && !entry.removed)
    .filter(
      (entry) =>
        !search ||
        normalizeSearchText(
          `${entry.sigaaCourse.name} ${entry.sigaaCourse.city} ${entry.sigaaCourse.sigaaId}`,
        ).includes(search),
    )
    .slice(0, 8)

  const pick = (entry: SigaaCourseEntry) => {
    setPicked(entry)
    setName(titleCase(entry.sigaaCourse.name))
    setSlug(slugify(entry.sigaaCourse.name))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!picked) return
    startTransition(async () => {
      const result = await createCourseAction({
        sigaaId: picked.sigaaCourse.sigaaId,
        slug,
        name,
        icon,
        color: null,
      })
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível criar o curso')
        return
      }
      toast.success('Curso criado')
      onCreated(result.data)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {picked ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
          <span>
            <span className="block font-medium">{picked.sigaaCourse.name}</span>
            <span className="text-muted-foreground">
              {picked.sigaaCourse.city} ·{' '}
              {picked.sigaaCourse.unitName ?? 'sem unidade'} · SIGAA{' '}
              {picked.sigaaCourse.sigaaId}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPicked(null)}
          >
            Trocar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="sigaa-search">Curso no SIGAA</Label>
          <Input
            id="sigaa-search"
            placeholder="Nome, cidade ou código"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul
            className="flex flex-col divide-y rounded-xl border"
            aria-label="Cursos do SIGAA"
          >
            {options.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">
                Nenhum curso sem cadastro com esse nome.
              </li>
            )}
            {options.map((entry) => (
              <li key={entry.sigaaCourse.sigaaId}>
                <button
                  type="button"
                  onClick={() => pick(entry)}
                  className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">{entry.sigaaCourse.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.sigaaCourse.city} ·{' '}
                    {entry.sigaaCourse.modality === 'DISTANCE'
                      ? 'A distância'
                      : 'Presencial'}{' '}
                    · {entry.sigaaCourse.sigaaId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {picked && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="course-name">Nome no Flow</Label>
              <Input
                id="course-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="course-slug">Endereço</Label>
              <Input
                id="course-slug"
                required
                spellCheck={false}
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-icon">Ícone</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger id="course-icon" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COURSE_ICON_NAMES.map((item) => (
                  <SelectItem key={item} value={item}>
                    <span className="flex items-center gap-2">
                      <CourseDynamicIcon name={item} className="size-4" />
                      {item}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Importações que esperavam este curso viram rascunho na hora.
          </p>
          <div className="flex justify-end">
            <Button type="submit" isLoading={pending}>
              Criar curso
            </Button>
          </div>
        </>
      )}
    </form>
  )
}

export function CoursesManager({
  initialCourses,
  catalog,
  preselectedSigaaId,
}: {
  initialCourses: CourseDetail[]
  catalog: SigaaCourseEntry[]
  preselectedSigaaId: string | null
}) {
  const router = useRouter()
  const [courses, setCourses] = useState(initialCourses)
  const preselected =
    catalog.find(
      (entry) =>
        entry.sigaaCourse.sigaaId === preselectedSigaaId && !entry.flowCourseId,
    ) ?? null
  const [creating, setCreating] = useState(preselected !== null)
  const [pending, startTransition] = useTransition()

  const replace = (course: CourseDetail) =>
    setCourses((current) =>
      current.map((item) => (item.id === course.id ? course : item)),
    )

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setCreating(true)}>+ Novo curso</Button>
        <Button
          variant="outline"
          isLoading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await refreshSigaaCatalogAction()
              if (!result.ok) {
                toast.error(result.problem.detail ?? 'O SIGAA não respondeu')
                return
              }
              toast.success(
                `${result.data.total} cursos no SIGAA: ${result.data.added} novos, ${result.data.removed} removidos`,
              )
              router.refresh()
            })
          }
        >
          Atualizar catálogo do SIGAA
        </Button>
      </div>

      <ul className="flex flex-col divide-y rounded-2xl border bg-background">
        {courses.map((course) => {
          const published = course.curricula.filter(
            (item) => item.status === 'PUBLISHED',
          ).length
          return (
            <li
              key={course.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <CourseDynamicIcon name={course.icon} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{course.name}</span>
                <span className="text-xs text-muted-foreground">
                  /{course.slug} · {course.campus.name} · SIGAA {course.sigaaId}{' '}
                  · {course.curricula.length} estruturas ({published}{' '}
                  publicadas)
                </span>
              </span>
              <Chip
                className={cn(
                  course.isActive
                    ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {course.isActive ? 'Ativo' : 'Oculto'}
              </Chip>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await updateCourseAction(course.id, {
                      isActive: !course.isActive,
                    })
                    if (result.ok) replace(result.data)
                    else
                      toast.error(
                        result.problem.detail ?? 'Não foi possível salvar',
                      )
                  })
                }
              >
                {course.isActive ? 'Ocultar' : 'Mostrar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-700 dark:text-red-400"
                disabled={pending || published > 0}
                title={
                  published > 0
                    ? 'Só dá para excluir curso sem estruturas publicadas'
                    : undefined
                }
                onClick={() => {
                  if (
                    !window.confirm(
                      `Excluir ${course.name}? Os rascunhos vão junto.`,
                    )
                  )
                    return
                  startTransition(async () => {
                    const result = await deleteCourseAction(course.id)
                    if (result.ok)
                      setCourses((current) =>
                        current.filter((item) => item.id !== course.id),
                      )
                    else
                      toast.error(
                        result.problem.detail ?? 'Não foi possível excluir',
                      )
                  })
                }}
              >
                Excluir
              </Button>
            </li>
          )
        })}
      </ul>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo curso</DialogTitle>
            <DialogDescription>
              Escolha o curso na lista pública do SIGAA. O campus sai da cidade
              do curso.
            </DialogDescription>
          </DialogHeader>
          <NewCourse
            catalog={catalog}
            preselected={preselected}
            onCreated={(course) => {
              setCourses((current) =>
                [...current, course].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              )
              setCreating(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
