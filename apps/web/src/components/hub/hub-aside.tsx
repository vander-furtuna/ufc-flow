'use client'

import { ArrowSquareOutIcon, LinkSimpleIcon } from '@phosphor-icons/react'
import Link from 'next/link'

import { dayMonth, deadlineHint } from '@/lib/hub/post-display'
import { useHubDeadlines, useLinkPreview } from '@/lib/hub/use-hub'
import { cn } from '@/lib/utils'

import { postHref } from './post-card'

const panel = 'flex flex-col gap-3 rounded-2xl border bg-background p-5'

// Os 5 primeiros links da página do curso; o clique passa pelo /l/.../go,
// que conta com a origem "hub"
export function ImportantLinks({ courseSlug }: { courseSlug: string }) {
  const { data: preview } = useLinkPreview(courseSlug)
  if (!preview || preview.links.length === 0) return null
  return (
    <section aria-labelledby="hub-links" className={panel}>
      <h2 id="hub-links" className="font-clash text-lg font-semibold">
        Links importantes
      </h2>
      <ul className="flex flex-col">
        {preview.links.map((link) => (
          <li key={link.id}>
            <a
              href={`/l/${preview.slug}/go/${link.id}?src=hub`}
              target={link.openInSameTab ? undefined : '_blank'}
              rel={link.openInSameTab ? undefined : 'noopener noreferrer'}
              className="flex min-h-12 items-center gap-3 rounded-xl px-1 py-2 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              >
                <LinkSimpleIcon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">{link.label}</span>
              {!link.openInSameTab && (
                <>
                  <ArrowSquareOutIcon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="sr-only">(abre em outra aba)</span>
                </>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function NextDeadlines({
  courseSlug,
  now,
}: {
  courseSlug: string
  now: Date
}) {
  const { data: deadlines } = useHubDeadlines(courseSlug)
  if (!deadlines || deadlines.length === 0) return null
  return (
    <section aria-labelledby="hub-deadlines" className={panel}>
      <h2 id="hub-deadlines" className="font-clash text-lg font-semibold">
        Próximos prazos
      </h2>
      <ul className="flex flex-col gap-1">
        {deadlines.map((deadline) => {
          const hint = deadlineHint(deadline, now)
          return (
            <li key={deadline.postId}>
              <Link
                href={postHref(courseSlug, deadline.slug)}
                className="flex items-center gap-4 rounded-xl px-1 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="w-12 shrink-0 font-clash text-lg font-semibold tabular-nums">
                  {dayMonth(deadline.at)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{deadline.title}</span>
                  <span
                    className={cn(
                      'text-xs',
                      hint.urgent
                        ? 'font-medium text-orange-700 dark:text-orange-400'
                        : 'text-muted-foreground',
                    )}
                  >
                    {hint.text}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
