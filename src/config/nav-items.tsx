import {
  CalendarCheckIcon,
  CalendarDotsIcon,
  ForkKnifeIcon,
  GraduationCapIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react/ssr'
import type { JSX } from 'react'

export function mountHref(path: string, baseHref?: string) {
  return baseHref ? `${baseHref}${path}` : path
}

export type NavItem = {
  id: string
  label: string
  icon: JSX.Element
  href: (baseHref?: string) => string
}

export const navItems: NavItem[] = [
  {
    id: 'restaurante',
    label: 'Cardápio do RU',
    icon: <ForkKnifeIcon weight="bold" className="size-6 text-inherit" />,
    href: () => '/restaurante',
  },
  {
    id: 'cursos',
    label: 'Cursos',
    icon: <GraduationCapIcon weight="bold" className="size-6 text-inherit" />,
    href: () => '/cursos',
  },
  {
    id: 'grade',
    label: 'Grade Curricular',
    icon: <SquaresFourIcon weight="bold" className="size-6 text-inherit" />,
    href: (baseHref?: string) => mountHref('', baseHref) || '/',
  },
  {
    id: 'agenda',
    label: 'Simular Agenda',
    icon: <CalendarCheckIcon weight="bold" className="size-6 text-inherit" />,
    href: (baseHref?: string) => (baseHref ? `${baseHref}/agenda` : '/'),
  },
  {
    id: 'calendario',
    label: 'Calendário Acadêmico',
    icon: <CalendarDotsIcon weight="bold" className="size-6 text-inherit" />,
    href: () => '/calendario',
  },
]
