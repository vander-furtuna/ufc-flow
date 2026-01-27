'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { ClassProvider } from '@/contexts/class'
import { CourseProvider } from '@/contexts/course'
import { FilterProvider } from '@/contexts/filter'
import { queryClient } from '@/lib/query-client'
import { ToolsProvider } from '@/contexts/tools'
import { ScheduleProvider } from '@/contexts/schedule'

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToolsProvider>
        <FilterProvider>
          <CourseProvider>
            <ClassProvider>
              <ScheduleProvider>{children}</ScheduleProvider>
            </ClassProvider>
          </CourseProvider>
        </FilterProvider>
      </ToolsProvider>
    </QueryClientProvider>
  )
}
