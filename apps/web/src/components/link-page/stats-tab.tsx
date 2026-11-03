'use client'

import type { LinkTrafficSource } from '@ufc-flow/contracts'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { linkStatsAction } from '@/lib/link-page/link-page-actions'
import { cn } from '@/lib/utils'

const SOURCES: Record<LinkTrafficSource, string> = {
  PAGE: 'Página',
  QR: 'QR code',
  HUB: 'Hub',
}

const number = new Intl.NumberFormat('pt-BR')

// Aba Estatísticas: visitas, cliques e os links mais clicados, só contagens
export function StatsTab({ courseSlug }: { courseSlug: string }) {
  const [days, setDays] = useState<7 | 30>(7)
  const stats = useQuery({
    queryKey: ['link-page', courseSlug, 'stats', days],
    queryFn: async () => {
      const result = await linkStatsAction(courseSlug, days)
      if (!result.ok) throw new Error(result.problem.detail)
      return result.data
    },
  })

  const data = stats.data
  const views = data?.views.reduce((sum, row) => sum + row.count, 0) ?? 0
  const clicks = data?.links.reduce((sum, row) => sum + row.clicks, 0) ?? 0
  const qr =
    data?.views
      .filter((row) => row.source === 'QR')
      .reduce((sum, row) => sum + row.count, 0) ?? 0
  const top = data?.links.filter((row) => row.clicks > 0).slice(0, 10) ?? []
  const max = Math.max(1, ...top.map((row) => row.clicks))

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex w-fit gap-1 rounded-xl border bg-muted p-1">
        <legend className="sr-only">Período</legend>
        {([7, 30] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={days === value}
            onClick={() => setDays(value)}
            className={cn(
              'h-9 rounded-lg px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              days === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {value} dias
          </button>
        ))}
      </fieldset>

      {stats.isError ? (
        <p role="alert" className="rounded-2xl border p-4 text-sm">
          Não foi possível carregar as estatísticas agora.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              [`Visitas · ${days} dias`, views],
              [`Cliques · ${days} dias`, clicks],
              ['Pelo QR code', qr],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col gap-1 rounded-2xl border bg-background p-3 sm:p-4"
              >
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-clash text-2xl font-semibold tabular-nums">
                  {stats.isPending ? '…' : number.format(Number(value))}
                </dd>
              </div>
            ))}
          </dl>

          <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-5">
            <h2 className="font-clash text-lg font-semibold">
              Links mais clicados
            </h2>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {stats.isPending ? 'Carregando…' : 'Nenhum clique no período.'}
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {top.map((row) => (
                  <li key={row.linkId} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium">
                        {row.label}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {number.format(row.clicks)}
                      </span>
                    </div>
                    <div
                      aria-hidden
                      className="h-2 overflow-hidden rounded-full bg-foreground/10"
                    >
                      <div
                        className="h-full rounded-full bg-cyan-600"
                        style={{ width: `${(row.clicks / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Object.entries(row.bySource)
                        .map(
                          ([source, count]) =>
                            `${SOURCES[source as LinkTrafficSource]} ${number.format(count ?? 0)}`,
                        )
                        .join(' · ')}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-muted-foreground">
              Contagem anônima: o Flow não guarda quem clicou.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
