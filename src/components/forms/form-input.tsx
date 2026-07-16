import type { ComponentProps } from 'react'
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'

type FormInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label?: string
  type?: ComponentProps<typeof Input>['type']
  placeholder?: string
  autoComplete?: string
  className?: string
}

export function FormInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  type,
  placeholder,
  autoComplete = 'off',
  className,
}: FormInputProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}

          <Input
            id={field.name}
            aria-invalid={fieldState.invalid}
            placeholder={placeholder}
            type={type}
            autoComplete={autoComplete}
            {...field}
          />

          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
