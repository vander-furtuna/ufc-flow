export function NoResultCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="h-24 w-38 rounded-lg bg-slate-100 font-space ring-1 ring-border center dark:bg-slate-900">
        <span className="text-slate-700 dark:text-slate-200">:&#40;</span>
      </div>
      <span>Nenhum resultado encontrado</span>
    </div>
  )
}
