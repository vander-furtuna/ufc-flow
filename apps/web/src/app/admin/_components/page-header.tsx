import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function Chip({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        className,
      )}
    >
      {children}
    </span>
  )
}

// Ponto com a cor da vertente (branches.color)
export function BranchDot({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full bg-slate-400"
      style={color ? { backgroundColor: color } : undefined}
    />
  )
}

export function PageHeader({
  crumbs = [],
  title,
  badges,
  description,
  actions,
}: {
  crumbs?: { href: string; label: string }[]
  title: string
  badges?: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {crumbs.length > 0 && (
          <nav aria-label="Caminho" className="text-sm text-muted-foreground">
            {crumbs.map((crumb, index) => (
              <span key={`${index}-${crumb.label}`}>
                {index > 0 && ' / '}
                <Link
                  href={crumb.href}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-clash text-2xl font-semibold md:text-3xl">
            {title}
          </h1>
          {badges}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
