import { CalendarClock, CalendarDays, LayoutGrid } from 'lucide-react'
import type { JSX } from 'react'

export function mountHref(path: string, baseHref?: string) {
  return baseHref ? `${baseHref}${path}` : path
}

type NavItem = {
  id: string
  label: string
  icon: JSX.Element
  href: (baseHref?: string) => string
}

export const navItems: NavItem[] = [
  {
    id: 'grade',
    label: 'Grade',
    icon: <LayoutGrid className="size-6 text-inherit" />,
    href: (baseHref?: string) => mountHref('', baseHref),
  },
  {
    id: 'calendario',
    label: 'Calendário',
    icon: <CalendarDays className="size-6 text-inherit" />,
    href: () => mountHref('/calendario'),
  },
  {
    id: 'agenda',
    label: 'Simular Agenda',
    icon: <CalendarClock className="size-6 text-inherit" />,
    href: (baseHref?: string) => mountHref('/agenda', baseHref),
  },
]
