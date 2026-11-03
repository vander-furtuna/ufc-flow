'use client'

import { XIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react'
import { createPortal } from 'react-dom'

import { Glow } from '@/components/glow'
import { navItems, type NavItem } from '@/config/nav-items'
import { useFeatures } from '@/contexts/features'
import { useCurrentEnrollment } from '@/lib/academic-record/use-academic'
import { signOutAction } from '@/lib/auth/actions'
import { SESSION_QUERY_KEY, useSession } from '@/lib/auth/use-session'
import { fileUrl } from '@/lib/files/upload'
import { useHubUnread } from '@/lib/hub/use-hub'
import { cn } from '@/lib/utils'

// O fundo e o cartão da conta vão num portal: a barra pode estar dentro de um
// contêiner com blur, que prenderia o position: fixed. Cliques ali não contam
// como "fora" do menu.
const NAV_PORTAL_ATTR = 'data-nav-portal'
export const isInsideNavPortal = (target: EventTarget | null) =>
  target instanceof Element && target.closest(`[${NAV_PORTAL_ATTR}]`) !== null

const GROUPS: { id: NavItem['group']; label: string }[] = [
  { id: 'course', label: 'Seu curso' },
  { id: 'ufc', label: 'Você e a UFC' },
]

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

const subscribeNoop = () => () => {}
const useIsClient = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )

export type UseActiveNavItemProps = {
  items?: NavItem[]
  baseHref?: string
  currentNavId?: string
}

export function useActiveNavItem({
  items = navItems,
  baseHref,
  currentNavId,
}: UseActiveNavItemProps = {}) {
  const pathname = usePathname()
  const params = useParams()

  const courseSlug = params?.courseSlug as string | undefined
  const curriculumSlug = params?.curriculumSlug as string | undefined
  const resolvedBaseHref =
    baseHref ??
    (courseSlug && curriculumSlug
      ? `/${courseSlug}/${curriculumSlug}`
      : undefined)

  const currentNavItem = useMemo(() => {
    if (currentNavId) {
      const byId = items.find((item) => item.id === currentNavId)
      if (byId) return byId
    }

    const byHref = items.find((item) => {
      const href = item.href(resolvedBaseHref || pathname)
      return href === pathname || (href !== '/' && pathname.startsWith(href))
    })

    return byHref ?? items[0]
  }, [items, currentNavId, resolvedBaseHref, pathname])

  const othersNavItems = useMemo(() => {
    return items.filter((item) => item.id !== currentNavItem?.id)
  }, [items, currentNavItem])

  return {
    currentNavItem,
    othersNavItems,
    resolvedBaseHref,
  }
}

export type NavMenuProps = {
  items?: NavItem[]
  baseHref?: string
  currentNavId?: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onSelect?: () => void
  className?: string
  glowColor?: string
}

// Conta no topo do menu aberto (mockup Mobile-Navegacao)
function AccountCard({ onLeave }: { onLeave: () => void }) {
  const { data: user } = useSession()
  const { enrollment } = useCurrentEnrollment()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLeaving, startLeaving] = useTransition()
  if (!user) return null

  const role = user.roles.includes('ADMIN')
    ? 'Admin'
    : user.moderatedCourses.length > 0
      ? 'Moderação'
      : null
  const detail = [enrollment?.course.name, role].filter(Boolean).join(' · ')

  const signOut = () =>
    startLeaving(async () => {
      await signOutAction()
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      onLeave()
      router.refresh()
    })

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-3xl border bg-background p-3 shadow-xl"
    >
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500 text-sm font-semibold text-white">
        {user.avatarFileId ? (
          <img
            src={fileUrl(user.avatarFileId)}
            alt=""
            width={44}
            height={44}
            className="size-full object-cover"
          />
        ) : (
          initials(user.name)
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{user.name}</span>
        {detail && (
          <span className="truncate text-xs text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={signOut}
        disabled={isLeaving}
        className="h-10 shrink-0 rounded-xl border px-3 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
      >
        Sair
      </button>
    </motion.div>
  )
}

export function NavMenu({
  items = navItems,
  baseHref,
  currentNavId,
  isOpen: controlledIsOpen,
  onOpenChange,
  onSelect,
  className,
  glowColor = '#22d3ee',
}: NavMenuProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false)
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen
  const isClient = useIsClient()

  const menuRef = useRef<HTMLDivElement>(null)
  const { data: user } = useSession()
  const { enrollment } = useCurrentEnrollment()

  const { currentNavItem, resolvedBaseHref } = useActiveNavItem({
    items,
    baseHref,
    currentNavId,
  })
  // Fora das páginas do curso, "Seu curso" usa a matrícula atual
  const courseHref =
    resolvedBaseHref ??
    (enrollment
      ? `/${enrollment.course.slug}/${enrollment.curriculum.slug}`
      : undefined)

  const features = useFeatures()
  const { data: hubUnread = 0 } = useHubUnread(
    features.api ? courseHref?.split('/')[1] : undefined,
  )

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: items.filter(
          (item) =>
            item.group === group.id &&
            (!item.requiresCourse || courseHref) &&
            (!item.requiresLogin || user) &&
            (!item.requiresApi || features.api),
        ),
      })).filter((group) => group.items.length > 0),
    [items, courseHref, user, features.api],
  )
  const total = groups.reduce((count, group) => count + group.items.length, 0)

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledIsOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange],
  )

  const handleToggle = useCallback(() => {
    setOpen(!isOpen)
  }, [isOpen, setOpen])

  const handleClose = useCallback(() => {
    setOpen(false)
    onSelect?.()
  }, [setOpen, onSelect])

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !isInsideNavPortal(event.target)
      ) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    if (!isControlled) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (!isControlled) {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, handleClose, isControlled])

  let order = 0

  return (
    // Sem animação para quem pede menos movimento no sistema
    <MotionConfig reducedMotion="user">
      <div ref={menuRef} className={cn('relative shrink-0', className)}>
        {isClient &&
          createPortal(
            <AnimatePresence>
              {isOpen && (
                <div {...{ [NAV_PORTAL_ATTR]: '' }}>
                  <motion.div
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleClose}
                    className="fixed inset-0 z-40 bg-background/75 backdrop-blur-md"
                  />
                  <AccountCard onLeave={handleClose} />
                </div>
              )}
            </AnimatePresence>,
            document.body,
          )}

        {/* Itens agrupados, acima do botão */}
        <AnimatePresence>
          {isOpen && (
            <nav
              aria-label="Navegação"
              className="absolute bottom-16 left-0 z-50 flex max-h-[calc(100dvh-10rem)] flex-col gap-4 overflow-y-auto pr-4"
            >
              {groups.map((group) => (
                <div key={group.id} className="flex flex-col gap-2">
                  <motion.span
                    className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {group.label}
                  </motion.span>
                  {group.items.map((item) => {
                    const delay = (total - order++) * 0.05
                    const current = item.id === currentNavItem?.id
                    return (
                      <Link
                        key={item.id}
                        href={item.href(courseHref)}
                        onClick={handleClose}
                        aria-current={current ? 'page' : undefined}
                        className="group/nav flex items-center gap-2 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <motion.span
                          className={cn(
                            'relative flex size-12 items-center justify-center overflow-hidden rounded-full border bg-background text-foreground/90 shadow-lg transition-colors group-hover/nav:text-foreground',
                            current && 'border-cyan-400 text-foreground',
                          )}
                          initial={{ opacity: 0, x: -10, filter: 'blur(10px)' }}
                          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, x: -10, filter: 'blur(10px)' }}
                          transition={{ duration: 0.15, delay }}
                        >
                          {item.icon}
                          <Glow
                            className="absolute -left-8 -z-1 size-16 opacity-0 blur-lg transition-all group-hover/nav:-left-4 group-hover/nav:opacity-50"
                            colors={glowColor}
                          />
                        </motion.span>
                        <motion.span
                          className={cn(
                            'rounded-full border bg-background px-3 py-1.5 text-sm font-medium text-nowrap text-foreground shadow-lg',
                            current && 'border-cyan-400',
                          )}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2, delay: delay + 0.05 }}
                        >
                          {item.label}
                          {item.id === 'hub' && hubUnread > 0 && (
                            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">
                              {hubUnread > 99 ? '99+' : hubUnread}
                              <span className="sr-only"> novidades</span>
                            </span>
                          )}
                        </motion.span>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>
          )}
        </AnimatePresence>

        {/* Botão circular: o ícone da página atual, ou X com o menu aberto */}
        <div
          className={cn(
            'relative z-50 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent/70 shadow-lg backdrop-blur-md',
            isOpen && 'border-cyan-300 bg-cyan-400',
          )}
        >
          <button
            type="button"
            className="relative flex size-12 shrink-0 cursor-pointer items-center justify-center text-foreground/90 transition-all"
            onClick={handleToggle}
            data-state={isOpen ? 'active' : 'default'}
            aria-label={
              isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'
            }
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <XIcon weight="bold" className="size-6 text-cyan-950" />
            ) : (
              currentNavItem?.icon
            )}
            <Glow
              data-state={isOpen ? 'active' : 'default'}
              className="absolute -left-8 -z-1 size-12 opacity-0 blur-md transition-all data-[state=active]:-left-4 data-[state=active]:opacity-100"
              colors={glowColor}
            />
          </button>
        </div>
      </div>
    </MotionConfig>
  )
}
