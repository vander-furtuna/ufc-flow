'use client'

import { useCourse } from '@/contexts/course'
import { NATURE_CONFIG } from '@/data/colors'
import { getGradientColor } from '@/utils/get-gradient-color'
import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'
import { useMemo } from 'react'

export function SubjectTypeSubtitle() {
  const { selectedCurriculum } = useCourse()

  const { scrollRef, showLeftShadow, showRightShadow } =
    useHorizontalScrollWithOverlay<HTMLDivElement>()

  const maskImage = useMemo(() => {
    return `linear-gradient(to right, rgba(0, 0, 0, 0) ${showLeftShadow ? '2%' : '0%'}, rgba(0, 0, 0, 1) ${showLeftShadow ? '10%' : '0%'}, rgba(0, 0, 0, 1) ${showRightShadow ? '90%' : '100%'}, rgba(0, 0, 0, 0)  ${showRightShadow ? '98%' : '100%'})`
  }, [showLeftShadow, showRightShadow])

  // Only show natures that are actually present in the curriculum
  const activeNatures = useMemo(() => {
    if (!selectedCurriculum) return []
    const presentNatures = new Set(
      selectedCurriculum.subjects.map((s) => s.nature),
    )
    return NATURE_CONFIG.filter((n) => presentNatures.has(n.value))
  }, [selectedCurriculum])

  return (
    <div className="bg-accent/50 border-border relative w-full rounded-full border p-2">
      <div
        className="no-scrollbar relative flex w-full gap-2 overflow-x-auto"
        ref={scrollRef}
        style={{
          maskImage,
        }}
      >
        {activeNatures.map((nature) => (
          <div
            key={nature.value}
            className="bg-accent border-border flex shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1.5"
          >
            <div
              className="size-3 rounded-full"
              style={{
                background: getGradientColor(nature.color),
              }}
            />
            <span className="text-xs font-medium">{nature.label}</span>
          </div>
        ))}
        {selectedCurriculum?.branchs.map((branch) => (
          <div
            key={branch.id}
            className="bg-accent border-border flex shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1.5"
          >
            <div
              className="size-3 rounded-full"
              style={{
                background: getGradientColor(branch.color),
              }}
            />
            <span className="text-xs font-medium">{branch.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
