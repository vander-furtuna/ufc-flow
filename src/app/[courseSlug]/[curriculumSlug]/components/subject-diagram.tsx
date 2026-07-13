'use client'

import { NoResultCard } from '@/components/no-result-card'

import { useCourse } from '@/contexts/course'
import { groupByAlias, useTools } from '@/contexts/tools'
import { BranchView } from './subject-views/branch-view'
import { DurationView } from './subject-views/duration-view'
import { SemesterView } from './subject-views/semester-view'
import { Bolt, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tools } from '@/components/tools/tools'
import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export function SubjectDiagram() {
  const [isToolsOpen, setIsToolsOpen] = useState(false)

  const { filteredSubjects } = useCourse()
  const { groupBy } = useTools()

  return (
    <article className="flex w-full flex-col items-center justify-start gap-2">
      <div
        className={cn(
          'relative flex w-full items-center justify-between gap-2 py-2 transition-all duration-300',
          isToolsOpen && 'mb-6 md:mb-0',
        )}
      >
        <div className="flex items-center gap-1">
          <List className="text-muted-foreground size-5" />
          <strong className="font-clash text-xl font-medium">
            {groupByAlias(groupBy)}
          </strong>
        </div>

        <AnimatePresence>
          {isToolsOpen && (
            <motion.div
              className="absolute right-0 -bottom-6 w-full justify-end md:right-10 md:bottom-1/2 md:translate-y-1/2"
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
            >
              <Tools className="md:w-full md:justify-end" />
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsToolsOpen((p) => !p)}
        >
          <Bolt
            className="data-[state=open]:text-foreground data-[state=closed]:text-foreground/80 size-5 transition-transform data-[state=open]:rotate-90"
            data-state={isToolsOpen ? 'open' : 'closed'}
          />
        </Button>
      </div>

      {filteredSubjects.length > 0 ? (
        <div className="flex w-full flex-col items-center justify-start gap-8">
          {groupBy === 'semester' && <SemesterView />}
          {groupBy === 'branch' && <BranchView />}
          {groupBy === 'duration' && <DurationView />}
        </div>
      ) : (
        <div className="center size-full">
          <NoResultCard />
        </div>
      )}
    </article>
  )
}
