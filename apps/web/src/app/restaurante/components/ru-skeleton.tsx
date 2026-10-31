export function RuSkeleton() {
  return (
    <div className="flex w-full animate-pulse flex-col gap-6">
      {/* Cards de destaque (Principal e Vegetariano) */}
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex h-44 flex-col justify-between rounded-2xl border border-border/40 bg-card/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="size-8 rounded-lg bg-muted" />
            <div className="h-4 w-28 rounded-md bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-9 w-full rounded-lg bg-muted/70" />
            <div className="h-9 w-full rounded-lg bg-muted/70" />
          </div>
        </div>

        <div className="flex h-44 flex-col justify-between rounded-2xl border border-border/40 bg-card/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="size-8 rounded-lg bg-muted" />
            <div className="h-4 w-28 rounded-md bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-9 w-full rounded-lg bg-muted/70" />
            <div className="h-9 w-full rounded-lg bg-muted/70" />
          </div>
        </div>
      </div>

      {/* Grid de Acompanhamentos */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex h-32 flex-col justify-between rounded-xl border border-border/40 bg-card/30 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="size-6 rounded-md bg-muted" />
              <div className="h-3.5 w-20 rounded-md bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded-sm bg-muted/50" />
              <div className="h-3 w-3/4 rounded-sm bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
