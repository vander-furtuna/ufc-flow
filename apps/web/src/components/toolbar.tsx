'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ToolBarProps = {
  children: ReactNode
  className?: string
}

export function ToolBar({ children, className }: ToolBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
      className={cn(
        'absolute bottom-14 flex h-fit w-full items-center gap-1.5 rounded-full border border-border bg-accent/40 px-3 py-2 shadow-foreground/5 backdrop-blur-md',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
