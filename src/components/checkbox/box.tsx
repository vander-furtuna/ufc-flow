import { Check } from 'lucide-react'
import { type ComponentProps, forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface CheckboxBoxProps extends ComponentProps<'div'> {}

export const CheckboxBox = forwardRef<HTMLDivElement, CheckboxBoxProps>(
  ({ className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-primary ring-offset-background group-has-checked:bg-primary group-has-focus-visible:ring-ring flex size-4 cursor-pointer items-center justify-center rounded-sm border transition-all duration-150 ease-in-out group-has-focus-visible:ring-2 group-has-focus-visible:ring-offset-2 group-has-focus-visible:outline-hidden hover:brightness-110',
          className,
        )}
        {...rest}
      >
        <Check
          className="text-primary-foreground hidden size-4 group-has-checked:block"
          strokeWidth={3}
        />
      </div>
    )
  },
)

CheckboxBox.displayName = 'CheckboxBox'
