'use client'

import type {
  CurriculumDiff,
  CurriculumImportDetail,
} from '@ufc-flow/contracts'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  formatDate,
  HEADER_FIELD_LABELS,
  importStatus,
  reviewPointText,
} from '@/data/catalog-labels'
import {
  applyImportAction,
  discardImportAction,
} from '@/lib/catalog/admin-actions'

import { Chip, PageHeader } from '../../_components/page-header'

const FIELD_LABELS: Record<string, string> = {
  semester: 'semestre',
  nature: 'natureza',
  prerequisites: 'pré-requisitos',
  corequisites: 'co-requisitos',
  branches: 'vertentes',
  parent: 'vertente-mãe',
  name: 'nome',
  color: 'cor',
}

const show = (value: unknown) =>
  value === null || value === undefined || value === ''
    ? '—'
    : Array.isArray(value)
      ? value.join(', ') || '—'
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value as string | number | boolean)

function DiffList({
  title,
  diff,
}: {
  title: string
  diff: CurriculumDiff['subjects']
}) {
  const empty =
    diff.added.length + diff.removed.length + diff.changed.length === 0
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4">
      <h2 className="font-clash text-lg font-semibold">{title}</h2>
      {empty && <p className="text-sm text-muted-foreground">Nada muda.</p>}
      {diff.added.length > 0 && (
        <p className="text-sm">
          <Chip className="bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">
            + {diff.added.length}
          </Chip>{' '}
          <span className="font-mono">{diff.added.join(', ')}</span>
        </p>
      )}
      {diff.removed.length > 0 && (
        <p className="text-sm">
          <Chip className="bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">
            − {diff.removed.length}
          </Chip>{' '}
          <span className="font-mono">{diff.removed.join(', ')}</span>
        </p>
      )}
      {diff.changed.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl border text-sm">
          {diff.changed.map((item) => (
            <li key={item.key} className="flex flex-col gap-1 p-3">
              <span className="font-medium">{item.key}</span>
              {item.fields.map((field) => (
                <span key={field.field} className="text-muted-foreground">
                  {FIELD_LABELS[field.field] ?? field.field}:{' '}
                  <del className="font-mono">{show(field.before)}</del> →{' '}
                  <ins className="font-mono text-foreground no-underline">
                    {show(field.after)}
                  </ins>
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Detalhe da importação: diff da reimportação para aplicar, curso pendente
// ou o resultado de uma importação já aplicada
export function ImportDetail({
  initial,
  isAdmin,
}: {
  initial: CurriculumImportDetail
  isAdmin: boolean
}) {
  const router = useRouter()
  const [detail, setDetail] = useState(initial)
  const [pending, startTransition] = useTransition()
  const chip = importStatus(detail)
  const waiting = detail.status === 'RECEIVED'

  const apply = () =>
    startTransition(async () => {
      const result = await applyImportAction(detail.id)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível aplicar')
        return
      }
      toast.success('Diferenças aplicadas')
      setDetail(result.data)
      router.refresh()
    })

  const discard = () =>
    startTransition(async () => {
      if (!window.confirm('Descartar esta importação?')) return
      const result = await discardImportAction(detail.id)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível descartar')
        return
      }
      setDetail({ ...detail, ...result.data })
      router.refresh()
    })

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        crumbs={[{ href: '/admin/importacoes', label: 'Importações' }]}
        title={`${detail.course.name} · EC ${detail.curriculum.code}`}
        badges={<Chip className={chip.className}>{chip.label}</Chip>}
        description={`${detail.source === 'EXTENSION' ? 'Extensão' : 'Upload'} · ${
          detail.importedBy?.name ?? 'Conta removida'
        } · ${formatDate(detail.createdAt)} · ${detail.subjectCount} componentes`}
        actions={
          <>
            {detail.curriculum.id && (
              <Button variant="outline" asChild>
                <Link href={`/admin/estruturas/${detail.curriculum.id}`}>
                  Abrir no editor
                </Link>
              </Button>
            )}
            {waiting && (
              <Button variant="outline" disabled={pending} onClick={discard}>
                Descartar
              </Button>
            )}
            {waiting && detail.pendingReason === 'DIFF_REVIEW' && (
              <Button isLoading={pending} onClick={apply}>
                Aplicar diferenças
              </Button>
            )}
          </>
        }
      />

      {detail.pendingReason === 'COURSE_MISSING' && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p>
            O curso <strong>{detail.course.name}</strong> (código SIGAA{' '}
            <span className="font-mono">{detail.course.sigaaId}</span>) ainda
            não existe no Flow. Quando um administrador criar o curso, esta
            importação vira rascunho sozinha.
          </p>
          {isAdmin && (
            <Button asChild className="self-start">
              <Link href={`/admin/cursos?sigaa=${detail.course.sigaaId}`}>
                Criar o curso
              </Link>
            </Button>
          )}
        </section>
      )}

      {detail.diff && (
        <>
          {detail.diff.header.length > 0 && (
            <section className="flex flex-col gap-2 rounded-2xl border bg-background p-4">
              <h2 className="font-clash text-lg font-semibold">Cabeçalho</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {detail.diff.header.map((field) => (
                  <li key={field.field} className="text-muted-foreground">
                    {HEADER_FIELD_LABELS[field.field] ?? field.field}:{' '}
                    <del className="font-mono">{show(field.before)}</del> →{' '}
                    <ins className="font-mono text-foreground no-underline">
                      {show(field.after)}
                    </ins>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <DiffList title="Disciplinas" diff={detail.diff.subjects} />
          <DiffList title="Vertentes" diff={detail.diff.branches} />
        </>
      )}

      {detail.reviewPoints.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4">
          <h2 className="font-clash text-lg font-semibold">
            {waiting ? 'Pontos que vão para revisão' : 'Pontos para revisar'}
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {detail.reviewPoints.map((point) => (
              <li key={point.key}>
                <span className="font-mono font-medium">{point.code}</span> ·{' '}
                {reviewPointText(point)}{' '}
                {point.resolution && (
                  <Chip className="bg-muted text-muted-foreground">
                    resolvido
                  </Chip>
                )}
              </li>
            ))}
          </ul>
          {!waiting && detail.curriculum.id && (
            <p className="text-sm text-muted-foreground">
              Resolva os pontos no editor da estrutura.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
