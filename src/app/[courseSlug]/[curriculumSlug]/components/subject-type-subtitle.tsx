'use client'

import { useCourse } from '@/contexts/course'
import { NATURE_CONFIG } from '@/data/colors'
import { getGradientColor } from '@/utils/get-gradient-color'
import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'
import { useMemo } from 'react'
import { capitalizeWords } from '@/utils/capitalize-words'

export function SubjectTypeSubtitle() {
  const { selectedCurriculum } = useCourse()

  const { scrollRef, showLeftShadow, showRightShadow } =
    useHorizontalScrollWithOverlay<HTMLDivElement>()

  // Only show natures that are actually present in the curriculum
  const activeNatures = useMemo(() => {
    if (!selectedCurriculum) return []
    const presentNatures = new Set(
      selectedCurriculum.subjects.map((s) => s.nature),
    )
    return NATURE_CONFIG.filter((n) => presentNatures.has(n.value))
  }, [selectedCurriculum])

  return (
    <div className="relative w-full">
      <div
        className="no-scrollbar relative flex w-full gap-2 overflow-x-auto"
        ref={scrollRef}
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
            <span className="text-xs font-medium">
              {capitalizeWords(branch.name)}
            </span>
          </div>
        ))}
      </div>
      {/* Sombra da Esquerda */}
      <div
        aria-hidden="true"
        data-state={showLeftShadow ? 'visible' : 'hidden'}
        className="from-background pointer-events-none absolute top-0 left-0 h-full w-16 bg-linear-to-r to-transparent transition-all duration-200 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100"
      />

      {/* Sombra da Direita */}
      <div
        aria-hidden="true"
        data-state={showRightShadow ? 'visible' : 'hidden'}
        className="from-background pointer-events-none absolute top-0 right-0 z-10 h-full w-16 bg-linear-to-l to-transparent transition-all duration-200 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100"
      />
    </div>
  )
}
