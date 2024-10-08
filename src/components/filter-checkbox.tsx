import { type ComponentProps, forwardRef } from 'react'

import { Checkbox as BaseCheckbox } from './checkbox'

interface CheckboxProps extends ComponentProps<'input'> {
  label?: string
}

export const FilterCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...rest }, ref) => {
    return (
      <BaseCheckbox.Root className={className}>
        <BaseCheckbox.Element ref={ref} {...rest} />
        <BaseCheckbox.Box />
        {label && <BaseCheckbox.Label>{label}</BaseCheckbox.Label>}
      </BaseCheckbox.Root>
    )
  },
)

FilterCheckbox.displayName = 'Checkbox'
