import { type ComponentProps, forwardRef } from 'react'

interface CheckboxElementProps extends ComponentProps<'input'> {}

export const CheckboxElement = forwardRef<
  HTMLInputElement,
  CheckboxElementProps
>(({ ...rest }, ref) => {
  return <input ref={ref} className="sr-only" {...rest} type="checkbox" />
})

CheckboxElement.displayName = 'CheckboxElement'
