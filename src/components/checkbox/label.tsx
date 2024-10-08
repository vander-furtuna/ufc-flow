import { type ComponentProps, forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface CheckboxSpanProps extends ComponentProps<'span'> {}

export const CheckboxLabel = forwardRef<HTMLSpanElement, CheckboxSpanProps>(
  ({ children, className }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('font-medium text-checkbox-text', className)}
      >
        {children}
      </span>
    )
  },
)

CheckboxLabel.displayName = 'CheckboxLabel'
