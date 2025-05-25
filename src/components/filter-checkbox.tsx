import { type ChangeEvent, type ComponentProps, forwardRef } from 'react'

import { Checkbox as BaseCheckbox } from './checkbox'

interface CheckboxProps extends ComponentProps<'input'> {
  label?: string
  onCheckedChange: (value: string, checked: boolean) => void
}

export const FilterCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, onCheckedChange, onChange, ...rest }, ref) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onCheckedChange(event.target.value, event.target.checked)
      onChange?.(event)
    }

    return (
      <BaseCheckbox.Root className={className}>
        <BaseCheckbox.Element onChange={handleChange} ref={ref} {...rest} />
        <BaseCheckbox.Box />
        {label && <BaseCheckbox.Label>{label}</BaseCheckbox.Label>}
      </BaseCheckbox.Root>
    )
  },
)

FilterCheckbox.displayName = 'Checkbox'
