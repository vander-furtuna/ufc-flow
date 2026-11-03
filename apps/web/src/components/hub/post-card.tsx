import type { PostListItem, PostType } from '@ufc-flow/contracts'
import { CaretRightIcon, PushPinIcon } from '@phosphor-icons/react/ssr'
import Link from 'next/link'

import { POST_TYPES } from '@/data/post-types'
import { fileUrl } from '@/lib/files/upload'
import { eventDay, postChips, publishedLabel } from '@/lib/hub/post-display'
import { cn } from '@/lib/utils'

export const postHref = (courseSlug: string, slug: string) =>
  `/${courseSlug}/hub/${slug}`

export function PostTypeBadge({ type }: { type: PostType }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold',
        POST_TYPES[type].badge,
      )}
    >
      {POST_TYPES[type].label}
    </span>
  )
}

// Rascunho e arquivado só aparecem para quem modera (D81)
export function PostStatusBadge({ post }: { post: PostListItem }) {
  if (post.status === 'PUBLISHED') return null
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-dashed px-2.5 text-xs font-semibold text-muted-foreground">
      {post.status === 'DRAFT' ? 'Rascunho' : 'Arquivado'}
    </span>
  )
}

function Chips({ post }: { post: PostListItem }) {
  const chips = postChips(post)
  if (chips.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Detalhes">
      {chips.map((chip) => (
        <li
          key={chip}
          className="inline-flex h-7 items-center rounded-full border bg-background px-2.5 text-xs font-medium text-foreground/90"
        >
          {chip}
        </li>
      ))}
    </ul>
  )
}

// O título é o link; o ::after estende o clique ao card inteiro
const stretched =
  'after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring'

export function PostCard({
  post,
  courseSlug,
  now,
}: {
  post: PostListItem
  courseSlug: string
  now: Date
}) {
  const date = eventDay(post)
  return (
    <article
      className={cn(
        'relative flex flex-col gap-3 rounded-2xl border bg-muted/70 p-5 transition-colors hover:bg-muted',
        post.closed && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        {date && (
          <div
            aria-hidden
            className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border bg-background"
          >
            <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
              {date.month}
            </span>
            <span className="font-clash text-2xl leading-none font-semibold">
              {date.day}
            </span>
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <PostTypeBadge type={post.type} />
            <PostStatusBadge post={post} />
            <span className="text-xs text-muted-foreground">
              {publishedLabel(post, now)}
            </span>
          </div>
          <h3 className="text-lg leading-snug font-semibold text-balance">
            <Link href={postHref(courseSlug, post.slug)} className={stretched}>
              {post.title}
            </Link>
          </h3>
        </div>
      </div>
      {post.summary && (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {post.summary}
        </p>
      )}
      <Chips post={post} />
    </article>
  )
}

// Post fixado no topo do feed, com a capa ao lado no desktop
export function PinnedPost({
  post,
  courseSlug,
  now,
}: {
  post: PostListItem
  courseSlug: string
  now: Date
}) {
  return (
    <article className="relative grid overflow-hidden rounded-2xl border bg-muted/70 transition-colors hover:bg-muted md:grid-cols-[2fr_3fr]">
      {post.coverFileId && (
        <img
          src={fileUrl(post.coverFileId)}
          alt=""
          width={640}
          height={400}
          className="aspect-video size-full bg-muted object-cover md:aspect-auto"
        />
      )}
      <div
        className={cn(
          'flex flex-col gap-3 p-5 md:p-6',
          !post.coverFileId && 'md:col-span-2',
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <PostTypeBadge type={post.type} />
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <PushPinIcon aria-hidden className="size-3.5" />
            Fixado
          </span>
          <span className="text-xs text-muted-foreground">
            {publishedLabel(post, now)}
          </span>
        </div>
        <h2 className="font-clash text-2xl leading-tight font-semibold text-balance">
          <Link href={postHref(courseSlug, post.slug)} className={stretched}>
            {post.title}
          </Link>
        </h2>
        {post.summary && (
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {post.summary}
          </p>
        )}
        <Chips post={post} />
        <span
          aria-hidden
          className="mt-auto inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2"
        >
          {post.type === 'CALL' ? 'Ler edital' : 'Ler post'}
          <CaretRightIcon className="size-4" />
        </span>
      </div>
    </article>
  )
}
