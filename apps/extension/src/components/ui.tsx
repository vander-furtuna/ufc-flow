import logo from 'data-base64:../../assets/logo.svg'
import { Check, CircleAlert, CircleX } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import type { ReviewLevel } from '../sigaa/review'

export const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ')

export function Logo({ className }: { className?: string }) {
  return (
    <img src={logo} alt="" className={cn('shrink-0', className ?? 'size-9')} />
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost'
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'focus-visible:outline-primary inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' &&
          'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'outline' &&
          'border-border bg-background text-foreground hover:bg-muted border',
        variant === 'ghost' && 'text-foreground hover:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

export function Chip({
  children,
  mono = false,
  className,
}: {
  children: ReactNode
  mono?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'border-border bg-muted text-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        mono && 'font-mono',
        className,
      )}
    >
      {children}
    </span>
  )
}

const LEVEL_STYLES: Record<
  ReviewLevel,
  { icon: typeof Check; className: string; label: string }
> = {
  ok: { icon: Check, className: 'bg-green-50 text-green-700', label: 'Ok' },
  warning: {
    icon: CircleAlert,
    className: 'bg-amber-100 text-amber-700',
    label: 'Atenção',
  },
  error: { icon: CircleX, className: 'bg-red-100 text-red-700', label: 'Erro' },
}

export function LevelIcon({ level }: { level: ReviewLevel }) {
  const { icon: Icon, className, label } = LEVEL_STYLES[level]
  return (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full',
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export type TabItem<T extends string> = { id: T; label: ReactNode }

// Abas em pílula (segmented control), como nos mockups
export function Tabs<T extends string>({
  items,
  active,
  onChange,
  label,
}: {
  items: TabItem<T>[]
  active: T
  onChange: (id: T) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="border-border bg-muted flex gap-1 rounded-2xl border p-1"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === active}
          onClick={() => onChange(item.id)}
          className={cn(
            'focus-visible:outline-primary flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2',
            item.id === active
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
