import { AnimatePresence } from 'motion/react'
import { useMemo } from 'react'

import { SemesterTitle } from '@/components/title'

export function SubjectDiagramSkeleton() {
  const semestersValues = useMemo(
    () => Array.from({ length: 10 }, (_, i) => i + 1),
    [],
  )

  return (
    <article className="flex w-full flex-col items-center justify-start gap-12">
      {semestersValues.map((period) => (
        <div key={period} className="flex w-full flex-col gap-4">
          <SemesterTitle>{period}º PERÍODO</SemesterTitle>
          <div className="grid w-full grid-flow-dense auto-rows-[100px] grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] justify-items-center gap-4">
            <AnimatePresence>
              {Array.from({ length: 5 }, (_, i) => i + 1).map((element) => {
                return (
                  <div
                    className="h-24 w-38 animate-pulse rounded-lg bg-slate-100 font-clash ring-1 ring-border center dark:bg-slate-900"
                    key={element}
                  />
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </article>
  )
}
