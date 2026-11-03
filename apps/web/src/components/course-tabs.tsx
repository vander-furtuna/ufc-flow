'use client'

import { NewspaperIcon, SquaresFourIcon } from '@phosphor-icons/react'
import Link from 'next/link'

import { useFeatures } from '@/contexts/features'
import { useHubUnread } from '@/lib/hub/use-hub'
import { cn } from '@/lib/utils'

// Abas do curso (mockup Hub). O Fórum entra na fase 11. Sem a API, só existe
// a grade e as abas somem.
export function CourseTabs({
  courseSlug,
  curriculumSlug,
  current,
  className,
}: {
  courseSlug: string
  curriculumSlug?: string
  current: 'grade' | 'hub'
  className?: string
}) {
  const features = useFeatures()
  const { data: unread = 0 } = useHubUnread(
    features.api && current !== 'hub' ? courseSlug : undefined,
  )
  if (!features.api) return null

  const tabs = [
    {
      id: 'grade',
      label: 'Grade',
      href: curriculumSlug ? `/${courseSlug}/${curriculumSlug}` : '/cursos',
      icon: <SquaresFourIcon className="size-4" />,
    },
    {
      id: 'hub',
      label: 'Hub',
      href: `/${courseSlug}/hub`,
      icon: <NewspaperIcon className="size-4" />,
      badge: current !== 'hub' && unread > 0 ? unread : 0,
    },
  ]

  return (
    <nav
      aria-label="Seções do curso"
      className={cn(
        'flex w-full gap-1 rounded-2xl border bg-muted p-1 sm:w-fit',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === current
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-none',
              active
                ? 'bg-background font-semibold text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">
                {tab.badge > 99 ? '99+' : tab.badge}
                <span className="sr-only"> novidades</span>
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
