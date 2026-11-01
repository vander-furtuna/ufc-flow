import { CheckIcon } from '@phosphor-icons/react'
import { type ComponentProps, forwardRef } from 'react'

import { cn } from '@/lib/utils'

type CheckboxBoxProps = ComponentProps<'div'>

export const CheckboxBox = forwardRef<HTMLDivElement, CheckboxBoxProps>(
  ({ className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex size-4 cursor-pointer items-center justify-center rounded-sm border border-primary ring-offset-background transition-all duration-150 ease-in-out group-has-checked:bg-primary group-has-focus-visible:ring-2 group-has-focus-visible:ring-ring group-has-focus-visible:ring-offset-2 group-has-focus-visible:outline-hidden hover:brightness-110',
          className,
        )}
        {...rest}
      >
        <CheckIcon
          weight="bold"
          className="hidden size-4 text-primary-foreground group-has-checked:block"
        />
      </div>
    )
  },
)

CheckboxBox.displayName = 'CheckboxBox'
