'use client'

import type { Availability, GroupBy } from '@/types/tools'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useParams } from 'next/navigation'
import { getTools, setTools } from '@/storage/indexed-db'

type ToolsContextType = {
  groupBy: GroupBy
  availability: Availability
  highlightUnavailable: boolean
  selectGroupBy: (value: GroupBy) => void
  selectAvailability: (value: Availability) => void
  setHighlightUnavailable: (value: boolean) => void
  resetTools: () => void
  isToolsLoaded: boolean
}

const toolsContext = createContext<ToolsContextType>({} as ToolsContextType)

export function ToolsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [groupBy, setGroupBy] = useState<GroupBy>('semester')
  const [availability, setAvailability] = useState<Availability>('all')
  const [highlightUnavailable, setHighlightUnavailable] =
    useState<boolean>(false)
  const [isToolsLoaded, setIsToolsLoaded] = useState(false)
  const [prevCourseSlug, setPrevCourseSlug] = useState<string | undefined>(
    undefined,
  )

  const params = useParams()
  const courseSlug =
    typeof params?.courseSlug === 'string' ? params.courseSlug : undefined

  if (courseSlug !== prevCourseSlug) {
    setPrevCourseSlug(courseSlug)
    setIsToolsLoaded(!courseSlug)
  }

  useEffect(() => {
    if (!courseSlug) {
      return
    }

    let isMounted = true

    getTools(courseSlug)
      .then((saved) => {
        if (!isMounted) return

        if (saved) {
          setGroupBy(saved.groupBy ?? 'semester')
          setAvailability(saved.availability ?? 'all')
          setHighlightUnavailable(saved.highlightUnavailable ?? false)
        } else {
          setGroupBy('semester')
          setAvailability('all')
          setHighlightUnavailable(false)
        }
        setIsToolsLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load tools', err)
        if (isMounted) {
          setIsToolsLoaded(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [courseSlug])

  const loadedCourseSlugRef = useRef<string | null>(null)

  useEffect(() => {
    if (isToolsLoaded && courseSlug) {
      loadedCourseSlugRef.current = courseSlug
    } else if (!courseSlug) {
      loadedCourseSlugRef.current = null
    }
  }, [isToolsLoaded, courseSlug])

  useEffect(() => {
    if (!courseSlug || loadedCourseSlugRef.current !== courseSlug) {
      return
    }

    const tools = {
      groupBy,
      availability,
      highlightUnavailable,
    }

    setTools(courseSlug, tools).catch((err) => {
      console.error('Failed to save tools', err)
    })
  }, [courseSlug, groupBy, availability, highlightUnavailable])

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
      isToolsLoaded,
    }),
    [
      groupBy,
      availability,
      highlightUnavailable,
      selectGroupBy,
      selectAvailability,
      setHighlightUnavailable,
      resetTools,
      isToolsLoaded,
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
