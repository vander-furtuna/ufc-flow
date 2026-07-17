'use client'

import { useState } from 'react'
import { Bolt, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tools } from '@/components/tools/tools'
import { AnimatePresence, motion } from 'motion/react'
import { useTools, groupByAlias } from '@/contexts/tools'
import { cn } from '@/lib/utils'

export function VisualSettings({ className }: { className?: string }) {
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const { groupBy } = useTools()

  return (
    <div
      className={cn(
        'relative flex w-full items-center justify-between gap-2 py-2 transition-all duration-300',
        isToolsOpen && 'mb-8',
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <List className="text-muted-foreground size-5" />
        <strong className="font-clash text-lg font-medium">
          {groupByAlias(groupBy)}
        </strong>
      </div>

      <AnimatePresence>
        {isToolsOpen && (
          <motion.div
            className="absolute right-0 -bottom-6 z-100 w-full justify-end"
            initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
          >
            <Tools className="w-full justify-end" excludeSemester />
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => setIsToolsOpen((p) => !p)}
        className="size-8"
      >
        <Bolt
          className="data-[state=open]:text-foreground data-[state=closed]:text-foreground/80 size-5 transition-transform data-[state=open]:rotate-90"
          data-state={isToolsOpen ? 'open' : 'closed'}
        />
      </Button>
    </div>
  )
}
