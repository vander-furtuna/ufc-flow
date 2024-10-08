import { ChevronsUpDown } from 'lucide-react'
import { type ComponentProps, useCallback } from 'react'
import { toast } from 'sonner'

import { useCourse } from '@/app/contexts/course'
import { cn } from '@/lib/utils'

interface CurriculumSwitchProps extends ComponentProps<'button'> {}

export function CurriculumSwitch({
  className,
  ...rest
}: CurriculumSwitchProps) {
  const { selectedCourse, selectedCurriculum } = useCourse()

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
        <strong className="w-full truncate text-ellipsis text-left text-sm font-medium text-foreground">
          {selectedCourse?.name}
        </strong>
        <span className="text-xs">
          Ano-periodo: {selectedCurriculum?.period}
        </span>
      </div>
      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground opacity-35" />
    </button>
  )
}
