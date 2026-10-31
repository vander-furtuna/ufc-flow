export function RuSkeleton() {
  return (
    <div className="flex w-full animate-pulse flex-col gap-6">
      {/* Cards de destaque (Principal e Vegetariano) */}
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        <div className="bg-card/40 border-border/40 flex h-44 flex-col justify-between rounded-2xl border p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="bg-muted size-8 rounded-lg" />
            <div className="bg-muted h-4 w-28 rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="bg-muted/70 h-9 w-full rounded-lg" />
            <div className="bg-muted/70 h-9 w-full rounded-lg" />
          </div>
        </div>

        <div className="bg-card/40 border-border/40 flex h-44 flex-col justify-between rounded-2xl border p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="bg-muted size-8 rounded-lg" />
            <div className="bg-muted h-4 w-28 rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="bg-muted/70 h-9 w-full rounded-lg" />
            <div className="bg-muted/70 h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Grid de Acompanhamentos */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-card/30 border-border/40 flex h-32 flex-col justify-between rounded-xl border p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="bg-muted size-6 rounded-md" />
              <div className="bg-muted h-3.5 w-20 rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="bg-muted/50 h-3 w-full rounded-sm" />
              <div className="bg-muted/50 h-3 w-3/4 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
