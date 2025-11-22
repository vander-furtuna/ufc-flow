'use client'

import { useMemo } from 'react'
import { BranchPopup } from './popups/branch-popup'
import { DurationPopup } from './popups/duration-popup'
import { SemesterPopup } from './popups/semester-popup'
import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'

export function Filters() {
  const { scrollRef, showLeftShadow, showRightShadow } =
    useHorizontalScrollWithOverlay<HTMLDivElement>()

  const maskImage = useMemo(() => {
    return `linear-gradient(to right, rgba(0, 0, 0, 0) ${showLeftShadow ? '2%' : '0%'}, rgba(0, 0, 0, 1) ${showLeftShadow ? '10%' : '0%'}, rgba(0, 0, 0, 1) ${showRightShadow ? '90%' : '100%'}, rgba(0, 0, 0, 0)  ${showRightShadow ? '98%' : '100%'})`
  }, [showLeftShadow, showRightShadow])

  return (
    <div
      className="no-scrollbar relative z-100 flex w-full items-center gap-2 overflow-x-auto"
      ref={scrollRef}
      style={{
        maskImage,
      }}
    >
      <BranchPopup />
      <SemesterPopup />
      <DurationPopup />
    </div>
  )
}
