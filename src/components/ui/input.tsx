'use client'

import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'

import { cn } from '@/lib/utils'
import { Eye, EyeClosed } from 'lucide-react'

type InputButtonProps = React.ComponentProps<'button'>
function InputButton({ children, ...rest }: InputButtonProps) {
  return (
    <button
      type="button"
      className="absolute top-1/2 right-3 -translate-y-1/2"
      {...rest}
    >
      {children}
    </button>
  )
}

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  const [currentType, setCurrentType] = React.useState(type || 'text')

  return (
    <div className="relative h-fit w-full">
      <InputPrimitive
        type={currentType}

        data-slot="input"
        className={cn(
          'border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-10 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
          className,
        )}
        {...props}
      />
      {type === 'password' &&
        (currentType === 'password' ? (
          <InputButton
            onClick={() =>
              setCurrentType(currentType === 'password' ? 'text' : 'password')
            }
          >
            <Eye className="size-5" />
          </InputButton>
        ) : (
          <InputButton
            onClick={() =>
              setCurrentType(currentType === 'password' ? 'text' : 'password')
            }
          >
            <EyeClosed className="size-5" />
          </InputButton>
        ))}
    </div>
  )
}

export { Input }
