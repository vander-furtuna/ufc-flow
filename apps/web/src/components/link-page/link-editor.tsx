'use client'

import type { ManagedLinkPage, PostListItem } from '@ufc-flow/contracts'
import { ArrowSquareOutIcon, CaretLeftIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HUB_KEY } from '@/lib/hub/use-hub'
import {
  saveSettingsAction,
  type LinkPageResult,
} from '@/lib/link-page/link-page-actions'
import { previewOf } from '@/lib/link-page/link-tree'
import { cn } from '@/lib/utils'

import { AppearanceTab, type Settings } from './appearance-tab'
import { LinkPageView } from './link-page-view'
import { LinksTab } from './links-tab'
import { StatsTab } from './stats-tab'

const settingsOf = (page: ManagedLinkPage): Settings => ({
  slug: page.slug,
  bio: page.bio,
  avatarFileId: page.avatarFileId,
  avatarIcon: page.avatarIcon,
  coverFileId: page.coverFileId,
  theme: page.theme,
  buttonStyle: page.buttonStyle,
  buttonShape: page.buttonShape,
  titleFont: page.titleFont,
  isPublished: page.isPublished,
})

const subscribeNoop = () => () => {}

const trigger =
  'h-9 rounded-xl px-4 font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'

// Editor da página de links (mockups Links-Editor e Mobile-Links-Editor):
// cada mudança vai para a API e volta a página inteira (D89)
export function LinkEditor({
  course,
  initial,
  posts,
}: {
  course: { slug: string; name: string }
  initial: ManagedLinkPage
  posts: PostListItem[]
}) {
  const [page, setPage] = useState(initial)
  const [draft, setDraft] = useState(() => settingsOf(initial))
  const [isSaving, startSaving] = useTransition()
  // Última versão confirmada pela API, para desfazer a ordem otimista
  const confirmed = useRef(initial)
  const queryClient = useQueryClient()
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => '',
  )
  const saved = settingsOf(page)

  const run = async (
    action: () => Promise<LinkPageResult<ManagedLinkPage>>,
    success?: string,
  ) => {
    const result = await action()
    if (!result.ok) {
      setPage(confirmed.current)
      toast.error(result.problem.detail ?? 'Não foi possível salvar')
      return false
    }
    confirmed.current = result.data
    setPage(result.data)
    // Os "Links importantes" do hub vêm desta página
    void queryClient.invalidateQueries({ queryKey: [...HUB_KEY, course.slug] })
    if (success) toast.success(success)
    return true
  }

  const saveSettings = () =>
    startSaving(async () => {
      const ok = await run(
        () => saveSettingsAction(course.slug, draft),
        'Aparência salva',
      )
      if (ok) setDraft(settingsOf(confirmed.current))
    })

  const url = `${origin}/l/${page.slug}`
  const preview = previewOf(page)
  const phone = (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl dark:border-slate-700">
      <div className="h-[560px] [scrollbar-width:none] overflow-y-auto rounded-[1.8rem]">
        <LinkPageView
          compact
          title={course.name}
          settings={draft}
          socialLinks={page.socialLinks}
          links={preview.links}
          sections={preview.sections}
        />
      </div>
    </div>
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Endereço copiado')
    } catch {
      toast.error('Não foi possível copiar o endereço')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/${course.slug}/hub`}
            aria-label="Voltar ao hub"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CaretLeftIcon className="size-5" />
          </Link>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs text-muted-foreground">
              {course.name} · Hub
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-clash text-2xl font-semibold sm:text-3xl">
                Página de links
              </h1>
              <span
                className={cn(
                  'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold',
                  page.isPublished
                    ? 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-1.5 rounded-full',
                    page.isPublished ? 'bg-green-600' : 'bg-muted-foreground',
                  )}
                />
                {page.isPublished ? 'Publicada' : 'Despublicada'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <span className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border p-1 pl-3 sm:flex-none">
            <span className="min-w-0 truncate font-mono text-xs">
              {url.replace(/^https?:\/\//, '')}
            </span>
            <button
              type="button"
              onClick={copy}
              className="h-8 shrink-0 rounded-lg bg-muted px-3 text-xs font-semibold hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Copiar
            </button>
          </span>
          {page.isPublished && (
            <a
              href={`/l/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Ver página
              <ArrowSquareOutIcon aria-hidden className="size-4" />
              <span className="sr-only">(abre em outra aba)</span>
            </a>
          )}
        </div>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Tabs defaultValue="links" className="flex min-w-0 flex-col gap-4">
          <TabsList className="h-auto w-full rounded-2xl border bg-background p-1 sm:w-fit">
            <TabsTrigger
              value="links"
              className={cn(trigger, 'flex-1 sm:flex-none')}
            >
              Links
            </TabsTrigger>
            <TabsTrigger
              value="look"
              className={cn(trigger, 'flex-1 sm:flex-none')}
            >
              Aparência
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className={cn(trigger, 'flex-1 sm:flex-none')}
            >
              Estatísticas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="links" className="mt-0">
            <LinksTab
              page={page}
              courseSlug={course.slug}
              posts={posts}
              run={run}
              setPage={setPage}
            />
          </TabsContent>
          <TabsContent value="look" className="mt-0">
            <AppearanceTab
              draft={draft}
              saved={saved}
              courseId={page.courseId}
              onChange={setDraft}
              onSave={saveSettings}
              isSaving={isSaving}
              preview={phone}
            />
          </TabsContent>
          <TabsContent value="stats" className="mt-0">
            <StatsTab courseSlug={course.slug} />
          </TabsContent>
        </Tabs>

        <aside
          aria-label="Pré-visualização no celular"
          className="sticky top-6 hidden flex-col gap-3 lg:flex"
        >
          <span className="text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Pré-visualização
          </span>
          {phone}
        </aside>
      </div>
    </div>
  )
}
