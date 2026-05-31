import type { Availability, GroupBy } from '@/types/tools'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type ToolsContextType = {
  groupBy: GroupBy
  availability: Availability
  selectGroupBy: (value: GroupBy) => void
  selectAvailability: (value: Availability) => void
  resetTools: () => void
}

const toolsContext = createContext<ToolsContextType>({} as ToolsContextType)

export function ToolsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [groupBy, setGroupBy] = useState<GroupBy>('semester')
  const [availability, setAvailability] = useState<Availability>('all')

  const selectGroupBy = useCallback((value: GroupBy) => {
    setGroupBy(value)
  }, [])

  const selectAvailability = useCallback((value: Availability) => {
    setAvailability(value)
  }, [])

  const resetTools = useCallback(() => {
    setGroupBy('semester')
    setAvailability('all')
  }, [])

  const value = useMemo(
    () => ({
      groupBy,
      availability,
      selectGroupBy,
      selectAvailability,
      resetTools,
    }),
    [groupBy, availability, selectGroupBy, selectAvailability, resetTools],
  )

  return <toolsContext.Provider value={value}>{children}</toolsContext.Provider>
}

export function groupByAlias(groupBy: GroupBy) {
  switch (groupBy) {
    case 'semester':
      return 'Semestre'
    case 'branch':
      return 'Vertente'
    case 'duration':
      return 'Duração'
    default:
      return ''
  }
}

export function useTools() {
  const context = useContext(toolsContext)

  if (!context) {
    throw new Error('useTools must be used within a ToolsProvider')
  }

  return context
}
