import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/theme-toggle'
import { SignUpForm } from '@/features/auth/components/forms/sign-up'

export default function SignInPage() {
  return (
    <>
      <div className="flex w-full items-center justify-between">
        <Logo className="h-12" />

        <ModeToggle />
      </div>

      <div>
        <h1 className="font-clash text-4xl font-semibold">
          Registre-se no Flow
        </h1>
      </div>

      <SignUpForm />
    </>
  )
}
