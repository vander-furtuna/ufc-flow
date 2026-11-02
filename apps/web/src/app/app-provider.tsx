'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import type { CurrentTerm } from '@/lib/classes/classes-api'
import type { Course } from '@/types/course'

import { ClassProvider } from '@/contexts/class'
import { CourseProvider } from '@/contexts/course'
import { FilterProvider } from '@/contexts/filter'
import { queryClient } from '@/lib/query-client'
import { ToolsProvider } from '@/contexts/tools'
import { ScheduleProvider } from '@/contexts/schedule'
import { ScheduleImportPrompt } from '@/components/schedule-import/schedule-import-prompt'
import { CalendarProvider } from '@/contexts/calendar'

import { IconContext } from '@phosphor-icons/react'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppProvider({
  children,
  courses,
  currentTerm,
}: {
  children: ReactNode
  courses: Course[]
  currentTerm: CurrentTerm
}) {
  return (
    <IconContext.Provider value={{ weight: 'bold' }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          <ToolsProvider>
            <FilterProvider>
              <CourseProvider courses={courses}>
                <ClassProvider initialTerm={currentTerm}>
                  <CalendarProvider>
                    <ScheduleProvider>
                      {children}
                      <ScheduleImportPrompt />
                    </ScheduleProvider>
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
