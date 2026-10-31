'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { ClassProvider } from '@/contexts/class'
import { CourseProvider } from '@/contexts/course'
import { FilterProvider } from '@/contexts/filter'
import { queryClient } from '@/lib/query-client'
import { ToolsProvider } from '@/contexts/tools'
import { ScheduleProvider } from '@/contexts/schedule'
import { CalendarProvider } from '@/contexts/calendar'

import { IconContext } from '@phosphor-icons/react'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: 'bold' }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          <ToolsProvider>
            <FilterProvider>
              <CourseProvider>
                <ClassProvider>
                  <CalendarProvider>
                    <ScheduleProvider>{children}</ScheduleProvider>
                  </CalendarProvider>
                </ClassProvider>
              </CourseProvider>
            </FilterProvider>
          </ToolsProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </IconContext.Provider>
  )
}
