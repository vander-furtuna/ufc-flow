'use client'

import {
  CheckCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import type { ManagedCurriculum, PublicationIssue } from '@ufc-flow/contracts'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatDate } from '@/data/catalog-labels'

function Issues({
  items,
  tone,
}: {
  items: PublicationIssue[]
  tone: 'error' | 'warning'
}) {
  const Icon = tone === 'error' ? XCircleIcon : WarningCircleIcon
  return (
    <ul className="flex flex-col gap-2">
      {items.map((issue, index) => (
        <li
          key={`${issue.code}-${index}`}
          className={
            tone === 'error'
              ? 'flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300'
              : 'flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
          }
        >
          <Icon className="mt-0.5 size-4 shrink-0" />
          {issue.message}
        </li>
      ))}
    </ul>
  )
}

// "Revisar e publicar": mostra a checagem; erros barram, avisos não. Depois
// de publicada, marca como vigente.
export function PublishDialog({
  managed,
  pending,
  onPublish,
  onMakeCurrent,
}: {
  managed: ManagedCurriculum
  pending: boolean
  onPublish: () => void
  onMakeCurrent: () => void
}) {
  const { publicationCheck: check } = managed
  const published = managed.status === 'PUBLISHED'
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{published ? 'Publicação' : 'Revisar e publicar'}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {published ? 'Estrutura publicada' : 'Revisar e publicar'}
          </DialogTitle>
          <DialogDescription>
            {published
              ? `Publicada em ${formatDate(managed.publishedAt ?? managed.updatedAt)}. Mudanças agora ficam registradas na auditoria.`
              : 'Ao publicar, a estrutura aparece para todos no Flow.'}
          </DialogDescription>
        </DialogHeader>

        {!published && check.errors.length === 0 && (
          <p className="flex gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0" />
            Natureza, vertentes e pré-requisitos conferidos, sem ciclos.
          </p>
        )}
        {check.errors.length > 0 && (
          <Issues items={check.errors} tone="error" />
        )}
        {check.warnings.length > 0 && (
          <Issues items={check.warnings} tone="warning" />
        )}

        {published ? (
          <Button
            disabled={managed.isCurrent}
            isLoading={pending}
            onClick={onMakeCurrent}
          >
            {managed.isCurrent
              ? 'É a estrutura vigente'
              : 'Marcar como vigente'}
          </Button>
        ) : (
          <Button
            disabled={!check.canPublish}
            isLoading={pending}
            onClick={onPublish}
          >
            Publicar estrutura
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
