import {
  CalendarCheckIcon,
  ChatCircleIcon,
  CalendarDotsIcon,
  ForkKnifeIcon,
  GraduationCapIcon,
  NewspaperIcon,
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
  // Só com a API configurada (D51)
  requiresApi?: boolean
}

// Hub do curso a partir do endereço da grade (/{curso}/{ec} → /{curso}/hub)
export function hubHref(baseHref?: string) {
  const courseSlug = baseHref?.split('/')[1]
  return courseSlug ? `/${courseSlug}/hub` : '/'
}

// Fórum do curso a partir do endereço da grade
export function forumHref(baseHref?: string) {
  const courseSlug = baseHref?.split('/')[1]
  return courseSlug ? `/${courseSlug}/forum` : '/'
}

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
    id: 'hub',
    label: 'Hub do curso',
    icon: <NewspaperIcon weight="bold" className="size-6 text-inherit" />,
    href: hubHref,
    group: 'course',
    requiresCourse: true,
    requiresApi: true,
  },
  {
    id: 'forum',
    label: 'Fórum do curso',
    icon: <ChatCircleIcon weight="bold" className="size-6 text-inherit" />,
    href: forumHref,
    group: 'course',
    requiresCourse: true,
    requiresApi: true,
    requiresLogin: true,
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
