import type { LinkTrafficSource, PublicLinkPage } from '@ufc-flow/contracts'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { LinkPageView } from '@/components/link-page/link-page-view'
import { themeVars } from '@/lib/link-page/theme-style'

import { PageBar, ShareFooter, ViewBeacon } from './page-chrome'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Leitura pública com o mesmo cache de 60 s da API (D85, D89)
const getPage = cache(async (slug: string): Promise<PublicLinkPage> => {
  const apiUrl = process.env.API_URL
  if (!apiUrl || !SLUG.test(slug)) notFound()
  let response: Response
  try {
    response = await fetch(`${apiUrl}/v1/link-pages/${slug}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 },
    })
  } catch {
    throw new Error('Página de links indisponível')
  }
  if (response.status === 404) notFound()
  if (!response.ok) throw new Error(`API respondeu ${response.status}`)
  return (await response.json()) as PublicLinkPage
})

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ src?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage((await params).slug)
  return {
    title: `Links · ${page.course.name}`,
    description: page.bio ?? `Links oficiais de ${page.course.name}.`,
  }
}

const SOURCES: Record<string, LinkTrafficSource> = { qr: 'QR', hub: 'HUB' }

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params
  const page = await getPage(slug)
  // Quem chega pelo QR code conta como QR, inclusive nos cliques
  const source = SOURCES[(await searchParams).src ?? ''] ?? 'PAGE'
  const query = source === 'PAGE' ? '' : `?src=${source.toLowerCase()}`

  return (
    <div
      style={themeVars(page.theme)}
      className="flex min-h-dvh w-full justify-center bg-[var(--lp-bg)] px-4 pt-6 pb-10 text-[var(--lp-fg)]"
    >
      <ViewBeacon slug={page.slug} source={source} />
      <div className="flex w-full max-w-xl flex-col gap-6">
        <PageBar
          slug={page.slug}
          courseSlug={page.course.slug}
          title={page.course.name}
        />
        <LinkPageView
          title={page.course.name}
          settings={page}
          socialLinks={page.socialLinks}
          links={page.links}
          sections={page.sections}
          hrefOf={(link) => `/l/${page.slug}/go/${link.id}${query}`}
        />
        <ShareFooter slug={page.slug} />
      </div>
    </div>
  )
}
