import {
  CalendarCheckIcon,
  CalendarDotsIcon,
  ForkKnifeIcon,
  GraduationCapIcon,
  SquaresFourIcon,
  UserIcon,
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
  // "Seu curso" ou "Você e a UFC" (mockup Mobile-Navegacao)
  group: 'course' | 'ufc'
  // Só aparece com um curso escolhido (pela rota ou pela matrícula)
  requiresCourse?: boolean
  requiresLogin?: boolean
}

// Hub e Fórum entram aqui nas fases 10 e 11
export const navItems: NavItem[] = [
  {
    id: 'grade',
    label: 'Grade Curricular',
    icon: <SquaresFourIcon weight="bold" className="size-6 text-inherit" />,
    href: (baseHref?: string) => mountHref('', baseHref) || '/',
    group: 'course',
    requiresCourse: true,
  },
  {
    id: 'agenda',
    label: 'Simular Agenda',
    icon: <CalendarCheckIcon weight="bold" className="size-6 text-inherit" />,
    href: (baseHref?: string) => (baseHref ? `${baseHref}/agenda` : '/'),
    group: 'course',
    requiresCourse: true,
  },
  {
    id: 'cursos',
    label: 'Cursos',
    icon: <GraduationCapIcon weight="bold" className="size-6 text-inherit" />,
    href: () => '/cursos',
    group: 'course',
  },
  {
    id: 'minha-area',
    label: 'Minha área',
    icon: <UserIcon weight="bold" className="size-6 text-inherit" />,
    href: () => '/minha-area',
    group: 'ufc',
    requiresLogin: true,
  },
  {
    id: 'restaurante',
    label: 'Cardápio do RU',
    icon: <ForkKnifeIcon weight="bold" className="size-6 text-inherit" />,
    href: () => '/restaurante',
    group: 'ufc',
  },
  {
    id: 'calendario',
    label: 'Calendário Acadêmico',
    icon: <CalendarDotsIcon weight="bold" className="size-6 text-inherit" />,
    href: () => '/calendario',
    group: 'ufc',
  },
]
