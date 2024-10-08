import { type ComponentProps, forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface CheckboxRootProps extends ComponentProps<'label'> {}

export const CheckboxRoot = forwardRef<HTMLLabelElement, CheckboxRootProps>(
  ({ children, className, ...rest }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'group flex w-fit items-center justify-center gap-2',
          className,
        )}
        {...rest}
      >
        {children}
      </label>
    )
  },
)

CheckboxRoot.displayName = 'CheckboxRoot'
