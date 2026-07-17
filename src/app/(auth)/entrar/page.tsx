import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/theme-toggle'
import { SignInForm } from '@/features/auth/components/forms/sign-in'

export default function SignInPage() {
  return (
    <>
      <div className="flex w-full items-center justify-between">
        <Logo className="h-12" />

        <ModeToggle />
      </div>

      <div>
        <h1 className="font-heading text-4xl font-semibold">Entrar no Flow</h1>
      </div>

      <SignInForm />
    </>
  )
}
