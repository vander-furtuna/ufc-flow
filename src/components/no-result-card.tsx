export function NoResultCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 ">
      <div className="w-38 ring-1 ring-border h-24 rounded-lg bg-slate-100 dark:bg-slate-900 center font-space">
        <span className="text-slate-700 dark:text-slate-200">:&#40;</span>
      </div>
      <span>Nenhum resultado encontrado</span>
    </div>
  )
}
