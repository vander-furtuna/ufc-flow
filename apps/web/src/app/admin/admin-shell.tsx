'use client'

import { ListIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/theme-toggle'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  badge?: number
  adminOnly?: boolean
}

function Nav({
  items,
  onNavigate,
}: {
  items: NavItem[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  return (
    <nav aria-label="Administração">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-11 items-center justify-between rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  active && 'bg-muted text-foreground',
                )}
              >
                {item.label}
                {item.badge ? (
                  <span className="flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Brand({ role }: { role: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link href="/cursos" aria-label="UFC Flow, ir para os cursos">
        <Logo iconOnly className="size-10" />
      </Link>
      <div className="min-w-0">
        <p className="font-clash text-lg leading-tight font-semibold">
          Administração
        </p>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  )
}

// Menu lateral no desktop e folha no celular. Só os itens já existentes:
// hub, moderação e o resto chegam nas próximas fases.
export function AdminShell({
  role,
  isAdmin,
  pendingImports,
  children,
}: {
  role: string
  isAdmin: boolean
  pendingImports: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const items: NavItem[] = [
    { href: '/admin/estruturas', label: 'Estruturas curriculares' },
    { href: '/admin/importacoes', label: 'Importações', badge: pendingImports },
    { href: '/admin/semestres', label: 'Semestres e turmas' },
    { href: '/admin/cursos', label: 'Cursos', adminOnly: true },
  ].filter((item) => isAdmin || !item.adminOnly)

  return (
    <div className="flex min-h-dvh w-full bg-slate-50 dark:bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 border-r bg-background px-4 py-6 lg:flex">
        <Brand role={role} />
        <Nav items={items} />
        <div className="mt-auto">
          <ModeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background px-4 py-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Abrir menu da administração"
              className="flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ListIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col gap-8">
              <SheetTitle className="sr-only">Menu da administração</SheetTitle>
              <Brand role={role} />
              <Nav items={items} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Brand role={role} />
          <ModeToggle />
        </header>
        {/* O layout raiz já tem o <main> da página */}
        <div className="flex w-full min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  )
}
