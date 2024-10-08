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
          'flex size-4 cursor-pointer items-center justify-center rounded-sm border border-primary ring-offset-background transition-all duration-150 ease-in-out hover:brightness-110 group-has-[:checked]:bg-primary group-has-[:focus-visible]:outline-none group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-ring group-has-[:focus-visible]:ring-offset-2',
          className,
        )}
        {...rest}
      >
        <Check
          className="hidden size-4 text-primary-foreground group-has-[:checked]:block"
          strokeWidth={3}
        />
      </div>
    )
  },
)

CheckboxBox.displayName = 'CheckboxBox'
