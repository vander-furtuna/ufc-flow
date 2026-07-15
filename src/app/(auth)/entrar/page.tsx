import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/theme-toggle'

export default function SignInPage() {
  return (
    <>
      <div className="flex w-full items-center justify-between">
        <Logo className="h-12" />

        <ModeToggle />
      </div>

      <div>
        <h1 className="font-clash text-4xl font-semibold">Entrar no Flow</h1>
      </div>
    </>
  )
}
