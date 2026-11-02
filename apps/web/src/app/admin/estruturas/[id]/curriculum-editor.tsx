'use client'

import { collectCodes } from '@ufc-flow/academic-core'
import {
  DotsThreeIcon,
  MagnifyingGlassIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import type {
  CurriculumSubjectView,
  ManagedCurriculum,
  ReviewPoint,
  ReviewResolution,
} from '@ufc-flow/contracts'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  CURRENT_CHIP,
  formatHours,
  NATURE_CHIP,
  NATURE_LABELS,
  reviewPointText,
  STATUS_CHIP,
} from '@/data/catalog-labels'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  addCurriculumSubjectAction,
  createBranchAction,
  deleteCurriculumAction,
  makeCurrentAction,
  publishCurriculumAction,
  removeBranchAction,
  removeCurriculumSubjectAction,
  resolveReviewPointAction,
  setBranchSubjectsAction,
  updateBranchAction,
  updateCurriculumAction,
  updateCurriculumSubjectAction,
  type CatalogResult,
} from '@/lib/catalog/admin-actions'
import { describeExpr } from '@/lib/catalog/requirement-tree'
import { normalizeSearchText } from '@ufc-flow/academic-core'
import { cn } from '@/lib/utils'

import { CurriculumHeaderForm } from '../../_components/curriculum-header-form'
import { BranchDot, Chip, PageHeader } from '../../_components/page-header'
import { AddSubjectDialog } from './add-subject-dialog'
import { BranchesDialog } from './branches-dialog'
import { PublishDialog } from './publish-dialog'
import { SubjectPanel } from './subject-panel'

type Linking = {
  branchId: string
  natures: Map<string, 'MANDATORY' | 'OPTATIVE'>
}

function ReviewPoints({
  points,
  isAdmin,
  pending,
  onResolve,
}: {
  points: ReviewPoint[]
  isAdmin: boolean
  pending: boolean
  onResolve: (point: ReviewPoint, resolution: ReviewResolution) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const open = points.filter((point) => point.resolution === null)
  if (open.length === 0) return null
  const shown = expanded ? open : open.slice(0, 3)
  const actions = (point: ReviewPoint): [ReviewResolution, string][] => {
    switch (point.type) {
      case 'SUBJECT_NAME_MISMATCH':
        return [
          ['KEEP_CATALOG', 'Manter catálogo'],
          ['USE_IMPORTED', 'Usar nome do SIGAA'],
        ]
      case 'SUBJECT_WORKLOAD_MISMATCH':
        return [
          ['KEEP_CATALOG', 'Manter catálogo'],
          ['USE_IMPORTED', 'Usar carga do SIGAA'],
        ]
      case 'UNKNOWN_REQUIREMENT_CODE':
        return [['ACKNOWLEDGED', 'Ciente']]
      case 'EQUIVALENCES_SUGGESTED':
        return isAdmin
          ? [
              ['IGNORE', 'Ignorar'],
              ['APPLY', 'Aplicar equivalências'],
            ]
          : []
    }
  }
  return (
    <section
      aria-labelledby="review-points-title"
      className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <h2
        id="review-points-title"
        className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"
      >
        <WarningIcon className="size-4" />
        {open.length === 1
          ? '1 ponto para revisar antes de publicar'
          : `${open.length} pontos para revisar antes de publicar`}
      </h2>
      <ul className="flex flex-col gap-2">
        {shown.map((point) => (
          <li
            key={point.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background p-3 text-sm"
          >
            <p className="min-w-0 flex-1 basis-64">
              <span className="font-mono font-medium">{point.code}</span> ·{' '}
              {reviewPointText(point)}
            </p>
            <span className="flex flex-wrap gap-2">
              {actions(point).map(([resolution, label]) => (
                <Button
                  key={resolution}
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => onResolve(point, resolution)}
                >
                  {label}
                </Button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {open.length > shown.length || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="self-start text-sm font-medium text-amber-800 underline underline-offset-2 dark:text-amber-300"
        >
          {expanded ? 'Mostrar menos' : `Ver todos (${open.length})`}
        </button>
      ) : null}
    </section>
  )
}

function Requirement({
  subject,
  known,
}: {
  subject: CurriculumSubjectView
  known: ReadonlySet<string>
}) {
  if (!subject.prerequisites)
    return <span className="text-muted-foreground">—</span>
  const outside = collectCodes(subject.prerequisites).filter(
    (code) => !known.has(code),
  )
  return (
    <span
      className={cn(
        'font-mono text-xs',
        outside.length > 0 && 'text-orange-700 dark:text-orange-400',
      )}
      title={
        outside.length > 0
          ? `Fora desta estrutura: ${outside.join(', ')}`
          : undefined
      }
    >
      {describeExpr(subject.prerequisites)}
      {outside.length > 0 && <WarningIcon className="ml-1 inline size-3.5" />}
    </span>
  )
}

function BranchChips({
  subject,
  managed,
}: {
  subject: CurriculumSubjectView
  managed: ManagedCurriculum
}) {
  const names = new Map(managed.branches.map((branch) => [branch.id, branch]))
  if (subject.branches.length === 0)
    return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {subject.branches.map((link) => {
        const branch = names.get(link.branchId)
        return (
          <Chip key={link.branchId} className="bg-muted text-foreground">
            <BranchDot color={branch?.color ?? null} />
            {branch?.name ?? '?'}
          </Chip>
        )
      })}
    </span>
  )
}

const semesterLabel = (semester: number | null, count: number) =>
  semester === null
    ? `SEM SEMESTRE · ${count}`
    : `${semester}º PERÍODO · ${count}`

export function CurriculumEditor({
  initial,
  isAdmin,
}: {
  initial: ManagedCurriculum
  isAdmin: boolean
}) {
  const router = useRouter()
  const [managed, setManaged] = useState(initial)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [linking, setLinking] = useState<Linking | null>(null)
  const [branchesOpen, setBranchesOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [headerOpen, setHeaderOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  // Toda ação devolve a EC inteira, já com pontos para revisar e checagem
  const run = (
    action: () => Promise<CatalogResult<ManagedCurriculum>>,
    success?: string,
  ) =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const result = await action()
        if (result.ok) {
          setManaged(result.data)
          if (success) toast.success(success)
        } else {
          toast.error(result.problem.detail ?? 'Não foi possível salvar')
        }
        resolve(result.ok)
      }),
    )

  const id = managed.id
  const known = new Set(managed.subjects.map((subject) => subject.code))
  const search = normalizeSearchText(query.trim())
  const visible = managed.subjects.filter(
    (subject) =>
      !search ||
      subject.code.toLowerCase().includes(search) ||
      normalizeSearchText(subject.name).includes(search),
  )
  const groups = [...new Set(visible.map((subject) => subject.semester))]
    .sort((a, b) => (a ?? 99) - (b ?? 99))
    .map((semester) => ({
      semester,
      subjects: visible.filter((subject) => subject.semester === semester),
    }))
  const selectedSubject =
    managed.subjects.find((subject) => subject.code === selected) ?? null
  const linkingBranch = managed.branches.find(
    (branch) => branch.id === linking?.branchId,
  )

  const startLinking = (branchId: string) => {
    setBranchesOpen(false)
    setSelected(null)
    setLinking({
      branchId,
      natures: new Map(
        managed.subjects.flatMap((subject) => {
          const link = subject.branches.find(
            (item) => item.branchId === branchId,
          )
          return link ? [[subject.code, link.nature] as const] : []
        }),
      ),
    })
  }

  const onRowClick = (subject: CurriculumSubjectView) => {
    if (!linking) return setSelected(subject.code)
    setLinking((current) => {
      if (!current) return current
      const natures = new Map(current.natures)
      if (natures.has(subject.code)) natures.delete(subject.code)
      else natures.set(subject.code, subject.nature)
      return { ...current, natures }
    })
  }

  const finishLinking = async () => {
    if (!linking) return
    const ok = await run(
      () =>
        setBranchSubjectsAction(id, linking.branchId, {
          subjects: [...linking.natures].map(([code, nature]) => ({
            code,
            nature,
          })),
        }),
      'Vínculos salvos',
    )
    if (ok) setLinking(null)
  }

  const panel = selectedSubject && (
    <SubjectPanel
      key={selectedSubject.code}
      closable={isDesktop}
      subject={selectedSubject}
      managed={managed}
      pending={pending}
      onClose={() => setSelected(null)}
      onSave={(input) =>
        void run(
          () => updateCurriculumSubjectAction(id, selectedSubject.code, input),
          'Disciplina salva',
        )
      }
      onRemove={async () => {
        if (!window.confirm(`Tirar ${selectedSubject.code} desta estrutura?`))
          return
        if (
          await run(() =>
            removeCurriculumSubjectAction(id, selectedSubject.code),
          )
        ) {
          setSelected(null)
        }
      }}
    />
  )

  const isLinked = (subject: CurriculumSubjectView) =>
    linking?.natures.has(subject.code) ?? false

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        crumbs={[
          { href: '/admin/estruturas', label: managed.course.name },
          { href: '/admin/estruturas', label: 'Estruturas' },
        ]}
        title={`Estrutura ${managed.code}`}
        badges={
          <>
            <Chip className={STATUS_CHIP[managed.status].className}>
              {STATUS_CHIP[managed.status].label}
            </Chip>
            {managed.isCurrent && <Chip className={CURRENT_CHIP}>Vigente</Chip>}
            {managed.needsReimport && (
              <Chip className="bg-muted text-muted-foreground">
                Reimportar pela extensão
              </Chip>
            )}
          </>
        }
        description={`${managed.subjects.length} disciplinas · ${managed.branches.length} vertentes · ${formatHours(managed.header.minTotalHours)} mínimas · /${managed.course.slug}/${managed.slug}`}
        actions={
          <>
            {managed.lastImportId && (
              <Button variant="outline" asChild>
                <Link href={`/admin/importacoes/${managed.lastImportId}`}>
                  Diferenças da importação
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <a href={`/admin/estruturas/${id}/exportar`} download>
                Exportar JSON
              </a>
            </Button>
            <PublishDialog
              managed={managed}
              pending={pending}
              onPublish={() =>
                void run(
                  () => publishCurriculumAction(id),
                  'Estrutura publicada',
                )
              }
              onMakeCurrent={() =>
                void run(
                  () => makeCurrentAction(id),
                  'Agora é a estrutura vigente',
                )
              }
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <DotsThreeIcon className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setHeaderOpen(true)}>
                  Editar cabeçalho
                </DropdownMenuItem>
                {managed.status === 'DRAFT' && (
                  <DropdownMenuItem
                    className="text-red-700 dark:text-red-400"
                    onSelect={() => {
                      if (
                        !window.confirm(
                          'Descartar este rascunho? Não dá para desfazer.',
                        )
                      )
                        return
                      startTransition(async () => {
                        const result = await deleteCurriculumAction(id)
                        if (result.ok) router.push('/admin/estruturas')
                        else
                          toast.error(
                            result.problem.detail ??
                              'Não foi possível descartar',
                          )
                      })
                    }}
                  >
                    Descartar rascunho
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <ReviewPoints
        points={managed.reviewPoints}
        isAdmin={isAdmin}
        pending={pending}
        onResolve={(point, resolution) =>
          void run(() =>
            resolveReviewPointAction(point.importId, point.key, resolution),
          )
        }
      />

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-label="Disciplinas da estrutura"
          className="@container flex min-w-0 flex-[999_1_560px] flex-col overflow-hidden rounded-2xl border bg-background"
        >
          {linking && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-cyan-50 px-4 py-3 text-sm dark:bg-cyan-500/10">
              <p className="flex items-center gap-2">
                <BranchDot color={linkingBranch?.color ?? null} />
                <span>
                  <strong>Vinculando à vertente {linkingBranch?.name}.</strong>{' '}
                  {isDesktop ? 'Clique' : 'Toque'} nas disciplinas para incluir
                  ou tirar.
                </span>
              </p>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLinking(null)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  isLoading={pending}
                  onClick={() => void finishLinking()}
                >
                  Concluir
                </Button>
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-b p-3">
            <div className="relative min-w-0 flex-[1_1_220px]">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar por código ou nome"
                placeholder="Buscar por código ou nome"
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              + Disciplina
            </Button>
            <Button variant="outline" onClick={() => setBranchesOpen(true)}>
              Vertentes
            </Button>
          </div>

          {groups.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              {managed.subjects.length === 0
                ? 'Nenhuma disciplina ainda. Adicione pelo botão “+ Disciplina” ou importe pela extensão.'
                : 'Nenhuma disciplina com esse código ou nome.'}
            </p>
          )}

          {groups.map((group) => (
            <div key={group.semester ?? 'none'}>
              <h3 className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold tracking-wide text-foreground">
                {semesterLabel(group.semester, group.subjects.length)}
              </h3>
              <ul className="flex flex-col divide-y">
                {group.subjects.map((subject) => (
                  <li key={subject.code}>
                    <button
                      type="button"
                      aria-pressed={
                        linking ? isLinked(subject) : selected === subject.code
                      }
                      onClick={() => onRowClick(subject)}
                      className={cn(
                        'grid w-full gap-x-4 gap-y-1.5 px-4 py-3 text-left text-sm hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset @3xl:grid-cols-[88px_minmax(0,1fr)_110px_48px_minmax(0,160px)_minmax(0,180px)] @3xl:items-center',
                        !linking &&
                          selected === subject.code &&
                          'bg-cyan-50 shadow-[inset_3px_0_0] shadow-cyan-700 dark:bg-cyan-500/10',
                        linking &&
                          isLinked(subject) &&
                          'bg-cyan-50 dark:bg-cyan-500/10',
                      )}
                    >
                      <span className="flex items-center justify-between gap-2 @3xl:contents">
                        <span className="order-2 font-mono text-xs text-muted-foreground @3xl:order-none @3xl:text-sm @3xl:text-foreground">
                          {subject.code}
                        </span>
                        <span className="order-1 font-medium @3xl:order-none">
                          {subject.name}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2 @3xl:contents">
                        <span>
                          <Chip className={NATURE_CHIP[subject.nature]}>
                            {NATURE_LABELS[subject.nature]}
                          </Chip>
                        </span>
                        <span className="text-muted-foreground @3xl:text-foreground">
                          {subject.workloadHours}
                          <span className="@3xl:hidden"> h</span>
                        </span>
                        <BranchChips subject={subject} managed={managed} />
                      </span>
                      <span className="text-xs @3xl:text-sm">
                        <span className="text-muted-foreground @3xl:hidden">
                          Pré:{' '}
                        </span>
                        <Requirement subject={subject} known={known} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {isDesktop && panel && (
          <aside className="sticky top-6 w-[400px] shrink-0 rounded-2xl border bg-background p-5">
            {panel}
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Sheet
          open={Boolean(panel)}
          onOpenChange={(open) => !open && setSelected(null)}
        >
          <SheetContent
            side="bottom"
            className="max-h-[92dvh] overflow-y-auto rounded-t-3xl"
          >
            <SheetTitle className="sr-only">Editar disciplina</SheetTitle>
            {panel}
          </SheetContent>
        </Sheet>
      )}

      <AddSubjectDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        pending={pending}
        maxPeriods={managed.header.maxPeriods}
        onAdd={(input) =>
          run(
            () => addCurriculumSubjectAction(id, input),
            'Disciplina adicionada',
          )
        }
      />
      <BranchesDialog
        open={branchesOpen}
        onOpenChange={setBranchesOpen}
        managed={managed}
        pending={pending}
        onCreate={(input) =>
          run(() => createBranchAction(id, input), 'Vertente criada')
        }
        onUpdate={(branchId, input) =>
          run(() => updateBranchAction(id, branchId, input), 'Vertente salva')
        }
        onRemove={(branchId) => {
          if (!window.confirm('Remover esta vertente e os vínculos dela?'))
            return
          void run(() => removeBranchAction(id, branchId), 'Vertente removida')
        }}
        onLink={startLinking}
      />
      <Dialog open={headerOpen} onOpenChange={setHeaderOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cabeçalho da estrutura</DialogTitle>
            <DialogDescription>
              {managed.locked
                ? 'Já há matrícula: código, vigor, endereço e cargas não mudam mais.'
                : 'Mudar o endereço muda a URL pública da estrutura.'}
            </DialogDescription>
          </DialogHeader>
          <CurriculumHeaderForm
            initial={managed.header}
            submitLabel="Salvar cabeçalho"
            locked={managed.locked}
            pending={pending}
            onSubmit={async (header) => {
              if (
                await run(
                  () => updateCurriculumAction(id, header),
                  'Cabeçalho salvo',
                )
              ) {
                setHeaderOpen(false)
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
