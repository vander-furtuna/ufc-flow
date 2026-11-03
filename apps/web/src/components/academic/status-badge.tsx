import type { RecordStatus } from '@ufc-flow/academic-core'

import { STATUS_CLASSES } from '@/data/status-colors'
import { STATUS_LABELS } from '@/lib/academic-record/history'
import { cn } from '@/lib/utils'

export function StatusBadge({
  status,
  className,
}: {
  status: RecordStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
