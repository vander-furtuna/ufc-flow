import { type ComponentProps, forwardRef } from 'react'

type CheckboxElementProps = ComponentProps<'input'>

export const CheckboxElement = forwardRef<
  HTMLInputElement,
  CheckboxElementProps
>(({ ...rest }, ref) => {
  return <input ref={ref} className="sr-only" {...rest} type="checkbox" />
})

CheckboxElement.displayName = 'CheckboxElement'
