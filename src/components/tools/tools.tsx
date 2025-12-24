'use client'

import { useMemo } from 'react'
import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'
import { GroupByPopup } from './popups/group-by'
import { AvailabilityPopup } from './popups/availability'
import { SemesterTool } from './popups/semester'

export function Tools() {
  const { scrollRef, showLeftShadow, showRightShadow } =
    useHorizontalScrollWithOverlay<HTMLDivElement>()

  const maskImage = useMemo(() => {
    return `linear-gradient(to right, rgba(0, 0, 0, 0) ${showLeftShadow ? '2%' : '0%'}, rgba(0, 0, 0, 1) ${showLeftShadow ? '10%' : '0%'}, rgba(0, 0, 0, 1) ${showRightShadow ? '90%' : '100%'}, rgba(0, 0, 0, 0)  ${showRightShadow ? '98%' : '100%'})`
  }, [showLeftShadow, showRightShadow])

  return (
    <div
      className="no-scrollbar relative z-100 flex w-full items-center gap-1.5 overflow-x-auto"
      ref={scrollRef}
      style={{
        maskImage,
      }}
    >
      <SemesterTool />
      <GroupByPopup />
      <AvailabilityPopup />
    </div>
  )
}
