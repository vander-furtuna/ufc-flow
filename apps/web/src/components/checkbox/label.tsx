import { type ComponentProps, forwardRef } from 'react'

import { cn } from '@/lib/utils'

type CheckboxSpanProps = ComponentProps<'span'>

export const CheckboxLabel = forwardRef<HTMLSpanElement, CheckboxSpanProps>(
  ({ children, className }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('text-checkbox-text font-medium', className)}
      >
        {children}
      </span>
    )
  },
)

CheckboxLabel.displayName = 'CheckboxLabel'
