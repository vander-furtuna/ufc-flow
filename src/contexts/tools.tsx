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
  highlightUnavailable: boolean
  selectGroupBy: (value: GroupBy) => void
  selectAvailability: (value: Availability) => void
  setHighlightUnavailable: (value: boolean) => void
  resetTools: () => void
}

const toolsContext = createContext<ToolsContextType>({} as ToolsContextType)

export function ToolsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [groupBy, setGroupBy] = useState<GroupBy>('semester')
  const [availability, setAvailability] = useState<Availability>('all')
  const [highlightUnavailable, setHighlightUnavailable] = useState<boolean>(false)

  const selectGroupBy = useCallback((value: GroupBy) => {
    setGroupBy(value)
  }, [])

  const selectAvailability = useCallback((value: Availability) => {
    setAvailability(value)
  }, [])

  const resetTools = useCallback(() => {
    setGroupBy('semester')
    setAvailability('all')
    setHighlightUnavailable(false)
  }, [])

  const value = useMemo(
    () => ({
      groupBy,
      availability,
      highlightUnavailable,
      selectGroupBy,
      selectAvailability,
      setHighlightUnavailable,
      resetTools,
    }),
    [
      groupBy,
      availability,
      highlightUnavailable,
      selectGroupBy,
      selectAvailability,
      setHighlightUnavailable,
      resetTools,
    ],
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
