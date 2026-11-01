import Link from 'next/link'
import type { ReactNode } from 'react'

import { Logo } from './logo'
import { ModeToggle } from './theme-toggle'

// Casca das páginas sem mockup próprio (termos, privacidade, redefinir
// senha): mesma largura, logo e tipografia da página de cursos
export function SimplePage({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh w-full justify-center px-6 pt-12 pb-24">
      <section className="flex w-full max-w-3xl flex-col gap-12">
        <header className="flex w-full items-start justify-between">
          <Link href="/cursos" aria-label="UFC Flow, ir para os cursos">
            <Logo className="h-12 w-auto sm:h-14" />
          </Link>
          <ModeToggle />
        </header>
        <article className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-clash text-3xl font-semibold md:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </article>
      </section>
    </div>
  )
}
