'use client'

import type { LinkTrafficSource } from '@ufc-flow/contracts'
import {
  PencilSimpleIcon,
  QrCodeIcon,
  ShareNetworkIcon,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'

import { useFeatures } from '@/contexts/features'
import { useCanManageHub } from '@/lib/hub/use-hub'
import { countViewAction } from '@/lib/link-page/link-page-actions'

import { QrDialog } from './qr-dialog'

const pill =
  'inline-flex h-11 items-center gap-2 rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] focus-visible:outline-none'

const subscribeNoop = () => () => {}
// Endereço completo da página, só no navegador
const useOrigin = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => '',
  )

export function pageUrl(origin: string, slug: string) {
  return `${origin}/l/${slug}`
}

// Uma visita por abertura da página (a leitura fica em cache, D89)
export function ViewBeacon({
  slug,
  source,
}: {
  slug: string
  source: LinkTrafficSource
}) {
  useEffect(() => {
    void countViewAction(slug, source)
  }, [slug, source])
  return null
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Endereço copiado')
  } catch {
    toast.error('Não foi possível copiar o endereço')
  }
}

export function PageBar({
  slug,
  courseSlug,
  title,
}: {
  slug: string
  courseSlug: string
  title: string
}) {
  const origin = useOrigin()
  const { api } = useFeatures()
  const canManage = useCanManageHub(courseSlug)

  const share = async () => {
    const url = pageUrl(origin, slug)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Links · ${title}`, url })
        return
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
      }
    }
    await copy(url)
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={api ? `/${courseSlug}/hub` : '/'} className={pill}>
        <img src="/icon.svg" alt="" width={20} height={20} className="size-5" />
        <span className="hidden sm:inline">
          {api ? 'Hub do curso' : 'UFC Flow'}
        </span>
        <span className="sr-only sm:hidden">Hub do curso</span>
      </Link>
      <div className="flex items-center gap-2">
        {canManage && (
          <Link href={`/${courseSlug}/hub/links`} className={pill}>
            <PencilSimpleIcon aria-hidden className="size-4" />
            <span className="hidden sm:inline">Editar página</span>
            <span className="sr-only sm:hidden">Editar página</span>
          </Link>
        )}
        <button
          type="button"
          onClick={share}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--lp-accent)] px-4 text-sm font-semibold text-[var(--lp-on-accent)] focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <ShareNetworkIcon aria-hidden className="size-4" />
          Compartilhar
        </button>
      </div>
    </div>
  )
}

export function ShareFooter({ slug }: { slug: string }) {
  const origin = useOrigin()
  const url = pageUrl(origin, slug)
  const [qrOpen, setQrOpen] = useState(false)
  return (
    <footer className="flex flex-col items-center gap-3">
      <div className="flex max-w-full items-center gap-1 rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] p-1 pl-4">
        <span className="min-w-0 truncate font-mono text-xs sm:text-sm">
          {url.replace(/^https?:\/\//, '')}
        </span>
        <button
          type="button"
          onClick={() => copy(url)}
          className="h-9 shrink-0 rounded-full bg-[var(--lp-accent)] px-3 text-xs font-semibold text-[var(--lp-on-accent)] focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Copiar
        </button>
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          aria-label="Mostrar QR code"
          className="flex size-9 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] focus-visible:outline-none"
        >
          <QrCodeIcon aria-hidden className="size-5" />
        </button>
      </div>
      <span className="flex items-center gap-1.5 text-xs opacity-80">
        Feito com UFC Flow
      </span>
      <QrDialog open={qrOpen} onOpenChange={setQrOpen} url={url} slug={slug} />
    </footer>
  )
}
