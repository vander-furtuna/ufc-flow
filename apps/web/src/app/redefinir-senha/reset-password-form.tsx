'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircleIcon } from '@phosphor-icons/react'
import {
  resetPasswordInputSchema,
  type ResetPasswordInput,
} from '@ufc-flow/contracts'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  applyProblem,
  FieldError,
  FormAlert,
} from '@/components/auth/form-parts'
import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SESSION_QUERY_KEY } from '@/components/user-menu'
import { resetPasswordAction } from '@/lib/auth/actions'

export function ResetPasswordForm({ token }: { token: string }) {
  const [alert, setAlert] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordInputSchema),
    defaultValues: { token, password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (input) => {
    setAlert(null)
    const result = await resetPasswordAction(input)
    if (!result.ok) {
      setAlert(applyProblem(result.problem, ['password'], form.setError))
      return
    }
    // A redefinição encerra todas as sessões, inclusive a deste navegador
    queryClient.setQueryData(SESSION_QUERY_KEY, null)
    setDone(true)
  })

  if (done) {
    return (
      <div className="flex flex-col gap-4 rounded-[12px] border bg-muted px-4 py-4">
        <output className="flex flex-col gap-2">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircleIcon className="size-5 text-green-600" weight="fill" />
            Senha redefinida.
          </span>
          <span className="text-sm text-muted-foreground">
            Por segurança, saímos da sua conta em todos os dispositivos. Entre
            de novo com a senha nova.
          </span>
        </output>
        <Button asChild className="h-12 rounded-[12px] text-base font-semibold">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-password">Senha nova</Label>
        <PasswordInput
          id="reset-password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby="reset-password-hint reset-password-error"
          {...form.register('password')}
        />
        <p id="reset-password-hint" className="text-sm text-muted-foreground">
          Pelo menos 8 caracteres.
        </p>
        <FieldError
          id="reset-password-error"
          message={errors.password?.message}
        />
      </div>
      <FormAlert message={alert} />
      <Button
        type="submit"
        className="h-12 rounded-[12px] text-base font-semibold"
        isLoading={isSubmitting}
      >
        Salvar senha nova
      </Button>
    </form>
  )
}
