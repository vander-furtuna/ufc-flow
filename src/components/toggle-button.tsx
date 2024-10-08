import { ChevronsUpDown } from 'lucide-react'
import { useCallback } from 'react'
import { toast } from 'sonner'

interface ToggleButtonProps {
  label?: string
}

export function ToggleButton({ label }: ToggleButtonProps) {
  const handleOpenUserPopup = useCallback(() => {
    toast.info('Essa funcionalidade ainda não está disponível.')
  }, [])

  return (
    <button
      className="border rounded-sm px-3 py-2 flex items-center gap-2 justify-start cursor-default bg-slate-100 dark:bg-slate-900 h-12"
      onClick={handleOpenUserPopup}
    >
      <div className="flex-col flex items-start">
        <span className="text-xs text-foreground/80">Curso:</span>
        <strong className="font-medium text-sm text-foreground">{label}</strong>
      </div>
      <ChevronsUpDown className="text-muted-foreground size-4 opacity-35" />
    </button>
  )
}
