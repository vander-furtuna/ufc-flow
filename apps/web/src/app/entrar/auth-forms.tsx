'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  signInInputSchema,
  signUpInputSchema,
  type SignInInput,
} from '@ufc-flow/contracts'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { PasswordInput } from '@/components/auth/password-input'
import {
  applyProblem,
  FieldError,
  FormAlert,
  InfoNote,
} from '@/components/auth/form-parts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInAction, signUpAction } from '@/lib/auth/actions'

import { SESSION_QUERY_KEY } from '@/lib/auth/use-session'

const inputClass = 'h-12 rounded-[12px]'

function useAfterSession(next: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    router.replace(next)
    router.refresh()
  }
}

export function SignInForm({ next }: { next: string }) {
  const [alert, setAlert] = useState<string | null>(null)
  const afterSession = useAfterSession(next)
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInInputSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (input) => {
    setAlert(null)
    const result = await signInAction(input)
    if (result.ok) return afterSession()
    setAlert(applyProblem(result.problem, ['email', 'password'], form.setError))
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-in-email">E-mail</Label>
        <Input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="voce@alu.ufc.br"
          className={inputClass}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'sign-in-email-error' : undefined}
          {...form.register('email')}
        />
        <FieldError id="sign-in-email-error" message={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="sign-in-password">Senha</Label>
          <a
            href="#aviso-redefinir-senha"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Esqueci a senha
          </a>
        </div>
        <PasswordInput
          id="sign-in-password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? 'sign-in-password-error' : undefined
          }
          {...form.register('password')}
        />
        <FieldError
          id="sign-in-password-error"
          message={errors.password?.message}
        />
      </div>
      <InfoNote id="aviso-redefinir-senha">
        Ainda não enviamos e-mails. Para redefinir a senha, peça a um
        administrador um link de uso único.
      </InfoNote>
      <FormAlert message={alert} />
      <Button
        type="submit"
        className="h-12 rounded-[12px] text-base font-semibold"
        isLoading={isSubmitting}
      >
        Entrar
      </Button>
    </form>
  )
}

// O mockup tem uma caixa só para os dois aceites
const signUpFormSchema = signUpInputSchema
  .omit({ acceptTerms: true, acceptPrivacy: true })
  .extend({
    accept: z.literal(true, {
      error: () => 'Aceite os Termos de uso e a Política de privacidade',
    }),
  })

type SignUpForm = z.input<typeof signUpFormSchema>

export function SignUpForm({ next }: { next: string }) {
  const [alert, setAlert] = useState<string | null>(null)
  const afterSession = useAfterSession(next)
  const form = useForm<SignUpForm>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { name: '', email: '', password: '', accept: false as true },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async ({ accept, ...input }) => {
    setAlert(null)
    const result = await signUpAction({
      ...input,
      acceptTerms: accept,
      acceptPrivacy: accept,
    })
    if (result.ok) return afterSession()
    setAlert(
      applyProblem(
        result.problem,
        ['name', 'email', 'password'],
        form.setError,
      ),
    )
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-up-name">Nome</Label>
        <Input
          id="sign-up-name"
          autoComplete="name"
          className={inputClass}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'sign-up-name-error' : undefined}
          {...form.register('name')}
        />
        <FieldError id="sign-up-name-error" message={errors.name?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-up-email">E-mail</Label>
        <Input
          id="sign-up-email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="voce@alu.ufc.br"
          className={inputClass}
          aria-invalid={Boolean(errors.email)}
          aria-describedby="sign-up-email-hint sign-up-email-error"
          {...form.register('email')}
        />
        <p id="sign-up-email-hint" className="text-sm text-muted-foreground">
          Prefira o e-mail @alu.ufc.br: ele vai ser exigido para avaliar
          disciplinas.
        </p>
        <FieldError id="sign-up-email-error" message={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-up-password">Senha</Label>
        <PasswordInput
          id="sign-up-password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby="sign-up-password-hint sign-up-password-error"
          {...form.register('password')}
        />
        <p id="sign-up-password-hint" className="text-sm text-muted-foreground">
          Pelo menos 8 caracteres.
        </p>
        <FieldError
          id="sign-up-password-error"
          message={errors.password?.message}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <Controller
            control={form.control}
            name="accept"
            render={({ field }) => (
              <Checkbox
                id="sign-up-accept"
                className="mt-0.5 size-5 rounded-[6px]"
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={Boolean(errors.accept)}
                aria-describedby={
                  errors.accept ? 'sign-up-accept-error' : undefined
                }
              />
            )}
          />
          <Label htmlFor="sign-up-accept" className="leading-snug font-normal">
            Li e aceito os{' '}
            <Link href="/termos" target="_blank" className="underline">
              Termos de uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" target="_blank" className="underline">
              Política de privacidade
            </Link>
            .
          </Label>
        </div>
        <FieldError
          id="sign-up-accept-error"
          message={errors.accept?.message}
        />
      </div>
      <FormAlert message={alert} />
      <Button
        type="submit"
        className="h-12 rounded-[12px] text-base font-semibold"
        isLoading={isSubmitting}
      >
        Criar conta
      </Button>
    </form>
  )
}
