import type {
  LinkButtonShape,
  LinkButtonStyle,
  LinkPageTheme,
  LinkTitleFont,
  SocialNetwork,
} from '@ufc-flow/contracts'
import { ArrowSquareOutIcon, CaretRightIcon } from '@phosphor-icons/react/ssr'

import { CourseDynamicIcon } from '@/components/course-dynamic-icon'
import { fileUrl } from '@/lib/files/upload'
import { groupLinks } from '@/lib/link-page/link-tree'
import {
  buttonStyle,
  featuredStyle,
  themeVars,
} from '@/lib/link-page/theme-style'
import { cn } from '@/lib/utils'

import { LinkIcon, SOCIAL_NETWORKS } from './link-icons'

export type ViewLink = {
  id: string
  sectionId: string | null
  label: string
  description: string | null
  icon: string | null
  thumbnailFileId: string | null
  isFeatured: boolean
  badge: 'NONE' | 'NEW'
  openInSameTab: boolean
  fileMime?: string | null
}

export type ViewSettings = {
  theme: LinkPageTheme
  buttonStyle: LinkButtonStyle
  buttonShape: LinkButtonShape
  titleFont: LinkTitleFont
  bio: string | null
  avatarFileId: string | null
  avatarIcon: string | null
  coverFileId: string | null
}

export type LinkPageViewProps = {
  title: string
  settings: ViewSettings
  socialLinks: { id: string; network: SocialNetwork; url: string }[]
  links: ViewLink[]
  sections: { id: string; title: string }[]
  // Endereço do clique; sem ele (pré-visualização) o link não navega
  hrefOf?: (link: ViewLink) => string
  compact?: boolean
}

function NewBadge() {
  return (
    <span className="shrink-0 rounded-full bg-orange-600 px-2 py-0.5 text-[11px] font-bold text-white">
      NOVO
    </span>
  )
}

function Thumb({ link, compact }: { link: ViewLink; compact: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--lp-cover)] text-[var(--lp-accent)]',
        compact ? 'size-8' : 'size-11',
      )}
    >
      {link.thumbnailFileId ? (
        <img
          src={fileUrl(link.thumbnailFileId)}
          alt=""
          width={44}
          height={44}
          className="size-full object-cover"
        />
      ) : (
        <LinkIcon icon={link.icon} className={compact ? 'size-4' : 'size-5'} />
      )}
    </span>
  )
}

function LinkItem({
  link,
  settings,
  hrefOf,
  compact,
}: {
  link: ViewLink
  settings: ViewSettings
  hrefOf?: LinkPageViewProps['hrefOf']
  compact: boolean
}) {
  const isPdf = link.fileMime === 'application/pdf'
  const external = !link.openInSameTab
  const content = (
    <>
      <Thumb link={link} compact={compact} />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span
          className={cn(
            'font-semibold',
            compact ? 'truncate text-xs' : 'text-[15px]',
          )}
        >
          {link.label}
        </span>
        {link.description && !compact && (
          <span className="text-xs opacity-80">{link.description}</span>
        )}
      </span>
      {link.badge === 'NEW' && <NewBadge />}
      {isPdf && !compact ? (
        <span className="rounded-md border border-current/20 px-1.5 py-0.5 text-[11px] font-semibold opacity-80">
          PDF
        </span>
      ) : !compact ? (
        external ? (
          <ArrowSquareOutIcon
            aria-hidden
            className="size-4 shrink-0 opacity-70"
          />
        ) : (
          <CaretRightIcon aria-hidden className="size-4 shrink-0 opacity-70" />
        )
      ) : null}
    </>
  )
  const style = link.isFeatured
    ? featuredStyle(settings.buttonShape)
    : buttonStyle(settings.buttonStyle, settings.buttonShape)
  const className = cn(
    'flex w-full items-center gap-3 transition-transform focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lp-bg)] focus-visible:outline-none',
    compact
      ? 'min-h-10 px-2 py-1.5'
      : 'min-h-14 px-3 py-2.5 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
    link.isFeatured && !compact && 'min-h-20 px-3.5',
  )
  if (!hrefOf) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    )
  }
  return (
    <a
      href={hrefOf(link)}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={className}
      style={style}
    >
      {content}
      {external && <span className="sr-only">(abre em outra aba)</span>}
    </a>
  )
}

// A página de links como o público vê; o editor usa a mesma, compacta, na
// pré-visualização. As cores vêm do tema (variáveis CSS, ver theme-style).
export function LinkPageView({
  title,
  settings,
  socialLinks,
  links,
  sections,
  hrefOf,
  compact = false,
}: LinkPageViewProps) {
  const tree = groupLinks(links, sections)
  const item = (link: ViewLink) => (
    <li key={link.id}>
      <LinkItem
        link={link}
        settings={settings}
        hrefOf={hrefOf}
        compact={compact}
      />
    </li>
  )
  return (
    <div
      style={themeVars(settings.theme)}
      className={cn(
        'flex w-full flex-col items-center bg-[var(--lp-bg)] text-[var(--lp-fg)]',
        compact ? 'gap-2 px-3 pb-4' : 'gap-4',
      )}
    >
      <div
        className={cn(
          'w-full overflow-hidden bg-[var(--lp-cover)]',
          compact
            ? '-mx-3 h-20 w-[calc(100%+1.5rem)]'
            : 'h-36 rounded-3xl border border-[var(--lp-border)] sm:h-40',
        )}
      >
        {settings.coverFileId && (
          <img
            src={fileUrl(settings.coverFileId)}
            alt=""
            width={560}
            height={160}
            className="size-full object-cover"
          />
        )}
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden border-4 border-[var(--lp-bg)] bg-[var(--lp-surface)] text-[var(--lp-accent)] shadow-sm',
          compact ? '-mt-9 size-14 rounded-2xl' : '-mt-16 size-24 rounded-3xl',
        )}
      >
        {settings.avatarFileId ? (
          <img
            src={fileUrl(settings.avatarFileId)}
            alt=""
            width={96}
            height={96}
            className="size-full object-cover"
          />
        ) : (
          <CourseDynamicIcon
            name={settings.avatarIcon ?? 'graduation-cap'}
            aria-hidden
            className={compact ? 'size-6' : 'size-10'}
          />
        )}
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1
          className={cn(
            'leading-tight font-semibold text-balance',
            settings.titleFont === 'CLASH' ? 'font-clash' : 'font-sans',
            compact ? 'text-base' : 'text-3xl',
          )}
        >
          {title}
        </h1>
        {settings.bio && (
          <p
            className={cn(
              'opacity-85',
              compact ? 'text-[11px]' : 'text-[15px]',
            )}
          >
            {settings.bio}
          </p>
        )}
      </div>
      {socialLinks.length > 0 && (
        <ul
          className="flex flex-wrap justify-center gap-2"
          aria-label="Redes do curso"
        >
          {socialLinks.map((social) => {
            const { Icon, label } = SOCIAL_NETWORKS[social.network]
            const size = compact ? 'size-7' : 'size-11'
            const classes = `flex ${size} items-center justify-center rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] focus-visible:outline-none`
            return (
              <li key={social.id}>
                {hrefOf ? (
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={classes}
                  >
                    <Icon aria-hidden className="size-5" />
                  </a>
                ) : (
                  <span className={classes} title={label}>
                    <Icon aria-hidden className="size-3.5" />
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className={cn('flex w-full flex-col', compact ? 'gap-2' : 'gap-6')}>
        {(tree.featured || tree.top.length > 0) && (
          <ul className={cn('flex flex-col', compact ? 'gap-1.5' : 'gap-3')}>
            {tree.featured && item(tree.featured)}
            {tree.top.map(item)}
          </ul>
        )}
        {tree.sections.map((section) => (
          <section key={section.id} className="flex flex-col gap-2">
            <h2
              className={cn(
                'font-semibold tracking-wider uppercase opacity-80',
                compact ? 'text-[10px]' : 'px-1 text-xs',
              )}
            >
              {section.title}
            </h2>
            <ul className={cn('flex flex-col', compact ? 'gap-1.5' : 'gap-3')}>
              {section.links.map(item)}
            </ul>
          </section>
        ))}
        {links.length === 0 && (
          <p className="text-center text-sm opacity-80">
            Nenhum link publicado ainda.
          </p>
        )}
      </div>
    </div>
  )
}
