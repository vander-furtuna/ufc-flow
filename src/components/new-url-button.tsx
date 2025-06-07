import { ChevronsUpDown } from 'lucide-react'
import { type ComponentProps, useCallback } from 'react'
import { toast } from 'sonner'

import { useCourse } from '@/app/contexts/course'
import { cn } from '@/lib/utils'

interface NewUrlProps extends ComponentProps<'button'> {}

export function NewUrlButton({ className, ...rest }: NewUrlProps) {
  const { selectedCourse, selectedCurriculum } = useCourse()

  const handleOpenUserPopup = useCallback(() => {
    toast.info('Essa funcionalidade ainda não está disponível.')
  }, [])

  return (
    <button
      className={cn(
        'animate-border [background:linear-gradient(45deg,theme(colors.border),theme(colors.border)_50%,theme(colors.border))_padding-box,conic-gradient(from_var(--border-angle),theme(colors.slate.200/.48)_80%,_theme(colors.amber.500)_86%,_theme(colors.emerald.300)_90%,_theme(colors.sky.500)_94%,_theme(colors.slate.600/.48))_border-box] w-full rounded-md border-1 border-transparent dark:[background:linear-gradient(45deg,theme(colors.slate.900),theme(colors.slate.900)_50%,theme(colors.slate.900))_padding-box,conic-gradient(from_var(--border-angle),theme(colors.slate.700/.48)_80%,_theme(colors.amber.500)_86%,_theme(colors.emerald.300)_90%,_theme(colors.sky.500)_94%,_theme(colors.slate.200/.48))_border-box]',
        className,
      )}
      onClick={handleOpenUserPopup}
      {...rest}
    >
      <div className="flex w-full flex-col items-start overflow-hidden">
        <strong className="text-foreground w-full truncate text-left text-sm font-medium text-ellipsis">
          {selectedCourse?.name}
        </strong>
        <span className="text-xs">
          Ano-periodo: {selectedCurriculum?.period}
        </span>
      </div>
      <ChevronsUpDown className="text-foreground size-4 shrink-0 opacity-35" />
    </button>
  )
}
