import { ChevronsUpDown } from 'lucide-react'
import { type ComponentProps, useCallback } from 'react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

type ToggleButtonProps = ComponentProps<'button'> & {
  label?: string
  content?: string
}

export function ToggleButton({
  label,
  content,
  className,
  ...rest
}: ToggleButtonProps) {
  const handleOpenUserPopup = useCallback(() => {
    toast.info('Essa funcionalidade ainda não está disponível.')
  }, [])

  return (
    <button
      className={cn(
        'flex h-12 w-full cursor-default items-center justify-start gap-2 rounded-sm border bg-slate-100 px-3 py-2 dark:bg-slate-900',
        className,
      )}
      onClick={handleOpenUserPopup}
      {...rest}
    >
      <div className="flex w-full flex-col items-start overflow-hidden">
        <span className="text-foreground/80 text-xs">{label}</span>
        <strong className="text-foreground w-full truncate text-left text-sm font-medium text-ellipsis">
          {content}
        </strong>
      </div>
      <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 opacity-35" />
    </button>
  )
}
