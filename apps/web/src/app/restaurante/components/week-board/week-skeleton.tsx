'use client'

import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'
import { cn } from '@/lib/utils'

export function WeekSkeleton() {
  const { scrollRef, showLeftShadow, showRightShadow } =
    useHorizontalScrollWithOverlay<HTMLDivElement>({
      mode: 'auto',
      threshold: 10,
    })

  return (
    <div className="relative w-full">
      {/* Sombra de overflow à esquerda */}
      <div
        className={cn(
          'pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-10 bg-gradient-to-r from-background via-background/70 to-transparent transition-opacity duration-300 lg:hidden',
          showLeftShadow ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Sombra de overflow à direita */}
      <div
        className={cn(
          'pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-10 bg-gradient-to-l from-background via-background/70 to-transparent transition-opacity duration-300 lg:hidden',
          showRightShadow ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Container das Colunas de Skeleton */}
      <div
        ref={scrollRef}
        className="flex w-full snap-x scroll-pr-6 scroll-pl-6 gap-3 overflow-x-auto px-1.5 pt-1 pb-4 sm:scroll-pr-8 sm:scroll-pl-8 sm:px-2 lg:grid lg:scroll-p-0 lg:grid-cols-5 lg:gap-3.5 lg:overflow-visible lg:px-0"
      >
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="flex h-full min-w-[280px] shrink-0 animate-pulse flex-col rounded-2xl border border-border/60 bg-card/50 p-3.5 shadow-xs sm:min-w-[300px] lg:min-w-0"
          >
            {/* Header da Coluna */}
            <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2.5">
              <div className="flex flex-col gap-1.5">
                <div className="h-5 w-20 rounded-md bg-muted" />
                <div className="h-3.5 w-12 rounded-sm bg-muted/70" />
              </div>
              <div className="h-6 w-6 rounded-md bg-muted" />
            </div>

            {/* Cards de Refeição */}
            <div className="flex flex-1 flex-col gap-3">
              {/* Hero 1 (Principal) */}
              <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-accent/40 p-2.5">
                <div className="h-3.5 w-16 rounded-sm bg-muted" />
                <div className="h-10 w-full rounded-lg bg-muted/80" />
              </div>

              {/* Hero 2 (Vegetariano) */}
              <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-accent/40 p-2.5">
                <div className="h-3.5 w-20 rounded-sm bg-muted" />
                <div className="h-10 w-full rounded-lg bg-muted/80" />
              </div>

              {/* Acompanhamentos */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-border/40 bg-background/40 p-2.5">
                <div className="h-3 w-24 rounded-sm bg-muted/60" />
                <div className="h-3 w-32 rounded-sm bg-muted/50" />
                <div className="h-3 w-28 rounded-sm bg-muted/50" />
                <div className="h-3 w-20 rounded-sm bg-muted/50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
