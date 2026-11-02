import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import type {
  CursorPage,
  CurriculumImportStatus,
  CurriculumImportView,
} from '@ufc-flow/contracts'
import type { Metadata } from 'next'
import Link from 'next/link'

import { formatDate, importStatus } from '@/data/catalog-labels'
import { adminPage } from '@/lib/catalog/admin-api'
import { cn } from '@/lib/utils'

import { Chip, PageHeader } from '../_components/page-header'
import { UploadImport } from './upload-import'

export const metadata: Metadata = { title: 'Importações' }

const FILTERS: [CurriculumImportStatus | null, string][] = [
  [null, 'Todas'],
  ['RECEIVED', 'Pendentes'],
  ['APPLIED', 'Aplicadas'],
  ['DISCARDED', 'Descartadas'],
]

const href = (status: CurriculumImportStatus | null, cursor?: string) => {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (cursor) params.set('cursor', cursor)
  const query = params.toString()
  return `/admin/importacoes${query ? `?${query}` : ''}`
}

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>
}) {
  const { status: rawStatus, cursor } = await searchParams
  const status = FILTERS.find(([value]) => value === rawStatus)?.[0] ?? null
  const params = new URLSearchParams({ limit: '20' })
  if (status) params.set('status', status)
  if (cursor) params.set('cursor', cursor)
  const page = await adminPage<CursorPage<CurriculumImportView>>(
    `/v1/ingestion/curriculum-imports?${params}`,
    href(status, cursor),
  )

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Importações"
        description="Estruturas enviadas pela extensão ou por upload do JSON."
        actions={<UploadImport />}
      />

      <nav
        aria-label="Filtrar importações"
        className="flex gap-2 overflow-x-auto"
      >
        {FILTERS.map(([value, label]) => (
          <Link
            key={label}
            href={href(value)}
            aria-current={status === value ? 'page' : undefined}
            className={cn(
              'flex h-9 shrink-0 items-center rounded-full border bg-background px-4 text-sm font-medium hover:bg-muted',
              status === value &&
                'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {page.items.length === 0 ? (
        <p className="rounded-xl border bg-background p-6 text-muted-foreground">
          Nenhuma importação aqui.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border bg-background">
          {page.items.map((item) => {
            const chip = importStatus(item)
            return (
              <li key={item.id}>
                <Link
                  href={`/admin/importacoes/${item.id}`}
                  className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {item.course.name} · EC {item.curriculum.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.source === 'EXTENSION' ? 'Extensão' : 'Upload'} ·{' '}
                      {item.importedBy?.name ?? 'Conta removida'} ·{' '}
                      {formatDate(item.createdAt)} · {item.subjectCount}{' '}
                      componentes
                    </span>
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {item.reviewPointCount > 0 && item.status === 'APPLIED' && (
                      <Chip className="bg-muted text-muted-foreground">
                        {item.reviewPointCount} para revisar
                      </Chip>
                    )}
                    <Chip className={chip.className}>{chip.label}</Chip>
                    <CaretRightIcon className="size-4 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {page.nextCursor && (
        <Link
          href={href(status, page.nextCursor)}
          className="self-center text-sm font-medium underline underline-offset-2"
        >
          Mais antigas
        </Link>
      )}
    </div>
  )
}
