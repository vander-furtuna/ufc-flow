'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { Header } from '@/components/header'
import { NavMenu } from '@/components/nav-menu'
import { cn } from '@/lib/utils'

// "Horas complementares" entra no PR 9.3 e "Avaliações" na fase 12
const SECTIONS = [
  { href: '/minha-area', label: 'Progresso' },
  { href: '/minha-area/historico', label: 'Histórico' },
  { href: '/minha-area/agendas', label: 'Agendas' },
]

export function AcademicShell({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  // Ação da barra flutuante, ao lado do menu (ex.: "Registrar disciplina")
  action?: ReactNode
}) {
  const pathname = usePathname()

  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-4 pt-8 pb-28 sm:px-6 sm:pt-12">
      <div className="flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
        <Header />

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {eyebrow}
            </span>
            <h1 className="font-clash text-3xl font-semibold text-foreground">
              {title}
            </h1>
          </div>
          <nav
            aria-label="Seções da minha área"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:gap-1 md:rounded-full md:border md:bg-muted md:p-1 md:px-1 md:pb-1"
          >
            {SECTIONS.map((section) => {
              const current = pathname === section.href
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-9 md:border-transparent md:font-medium',
                    current
                      ? 'border-primary bg-primary text-primary-foreground md:border-transparent md:bg-background md:text-foreground md:shadow-sm'
                      : 'bg-background text-foreground hover:bg-muted md:bg-transparent md:text-muted-foreground md:hover:bg-background/60 md:hover:text-foreground',
                  )}
                >
                  {section.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {children}
      </div>

      <div className="fixed bottom-6 left-0 z-50 flex w-full justify-center px-4">
        <div className="flex w-full gap-1 sm:w-md">
          <NavMenu currentNavId="minha-area" />
          {action}
        </div>
      </div>
      <div className="pointer-events-none fixed bottom-0 z-40 h-12 w-full bg-linear-to-b from-transparent to-background" />
    </main>
  )
}

// Cartão das seções da Minha área
export function Panel({
  title,
  aside,
  children,
  className,
  ...props
}: {
  title?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
} & React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-3xl border bg-card p-5 text-card-foreground sm:p-6',
        className,
      )}
      {...props}
    >
      {(title || aside) && (
        <div className="flex items-baseline justify-between gap-3">
          {title && (
            <h2 className="font-clash text-lg font-semibold">{title}</h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}
