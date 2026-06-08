'use client'

import { useMemo, type ComponentProps } from 'react'
import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'
import { GroupByPopup } from './popups/group-by'
import { AvailabilityPopup } from './popups/availability'
import { SemesterTool } from './popups/semester'
import { cn } from '@/lib/utils'

type ToolsProps = ComponentProps<'div'>

export function Tools({ className, ...rest }: ToolsProps) {
  const { scrollRef, showLeftShadow, showRightShadow } =
    useHorizontalScrollWithOverlay<HTMLDivElement>()

  const maskImage = useMemo(() => {
    return `linear-gradient(to right, rgba(0, 0, 0, 0) ${showLeftShadow ? '2%' : '0%'}, rgba(0, 0, 0, 1) ${showLeftShadow ? '10%' : '0%'}, rgba(0, 0, 0, 1) ${showRightShadow ? '90%' : '100%'}, rgba(0, 0, 0, 0)  ${showRightShadow ? '98%' : '100%'})`
  }, [showLeftShadow, showRightShadow])

  return (
    <div
      className={cn(
        'no-scrollbar relative z-100 flex w-full items-center gap-1.5 overflow-x-auto',
        className,
      )}
      ref={scrollRef}
      style={{
        maskImage,
      }}
      {...rest}
    >
      <SemesterTool />
      <GroupByPopup />
      <AvailabilityPopup />
    </div>
  )
}
