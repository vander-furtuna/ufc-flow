'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { Glow } from '@/components/glow'
import { navItems, type NavItem } from '@/config/nav-items'
import { cn } from '@/lib/utils'

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

  const menuRef = useRef<HTMLDivElement>(null)

  const { currentNavItem, othersNavItems, resolvedBaseHref } = useActiveNavItem(
    {
      items,
      baseHref,
      currentNavId,
    },
  )

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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  return (
    <div ref={menuRef} className={cn('relative shrink-0', className)}>
      {/* Menu Popup Flutuante de Itens de Navegação */}
      <AnimatePresence>
        {isOpen && (
          <div className="absolute bottom-14 left-0 z-50 flex flex-col gap-2">
            {othersNavItems.map((item, index) => (
              <Link
                key={item.id}
                href={item.href(resolvedBaseHref)}
                onClick={handleClose}
              >
                <motion.div className="flex cursor-pointer items-center gap-1">
                  <motion.div
                    className="border-border bg-background/50 text-foreground/90 hover:text-foreground group/nav relative flex size-12 items-center justify-center gap-2 overflow-hidden rounded-full border px-3 shadow-xl backdrop-blur-md transition-colors"
                    initial={{ opacity: 0, x: -10, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -10, filter: 'blur(10px)' }}
                    transition={{
                      duration: 0.15,
                      delay: (othersNavItems.length - index) * 0.08,
                    }}
                  >
                    {item.icon}
                    <Glow
                      className="absolute -left-8 -z-1 size-16 opacity-0 blur-lg transition-all group-hover/nav:-left-4 group-hover/nav:opacity-50"
                      colors={glowColor}
                    />
                  </motion.div>
                  <motion.span
                    className="bg-background/70 text-foreground rounded-full border px-2.5 py-1 text-xs font-medium text-nowrap shadow-xl backdrop-blur-md sm:text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{
                      duration: 0.2,
                      delay: (othersNavItems.length - index) * 0.08 + 0.05,
                    }}
                  >
                    {item.label}
                  </motion.span>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Botão de Trigger Circular à Esquerda */}
      <div className="border-border bg-accent/70 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-lg backdrop-blur-md">
        <button
          type="button"
          className="text-foreground/90 relative flex size-12 shrink-0 cursor-pointer items-center justify-center transition-all"
          onClick={handleToggle}
          data-state={isOpen ? 'active' : 'default'}
          aria-label="Abrir menu de navegação"
          aria-expanded={isOpen}
        >
          {currentNavItem && currentNavItem.icon}
          <Glow
            data-state={isOpen ? 'active' : 'default'}
            className="absolute -left-8 -z-1 size-12 opacity-0 blur-md transition-all data-[state=active]:-left-4 data-[state=active]:opacity-100"
            colors={glowColor}
          />
        </button>
      </div>
    </div>
  )
}
