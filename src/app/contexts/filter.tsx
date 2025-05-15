'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

type Mode = 'add' | 'remove'

type FilterContextProps = {
  query: string
  duration: number[]
  branch: string[]
  nature: string[]
  semester: number[]

  changeQueryFilter: (query: string) => void
  changeDurationFilter: (duration: string | number, mode: Mode) => void
  changeBranchFilter: (branch: string, mode: Mode) => void
  changeSemesterFilter: (semester: string | number, mode: Mode) => void
  changeNatureFilter: (nature: string, mode: Mode) => void
}

const filterContext = createContext({} as FilterContextProps)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('')
  const [duration, setDuration] = useState<number[]>([])
  const [branch, setBranch] = useState<string[]>([])
  const [nature, setNature] = useState<string[]>([])
  const [semester, setSemester] = useState<number[]>([])

  const changeDurationFilter = useCallback(
    (duration: string | number, mode: Mode) => {
      const parsedDuration = Number(duration)

      if (mode === 'add') {
        setDuration((old) => [...old, parsedDuration])
      } else {
        setDuration((old) => old.filter((d) => d !== parsedDuration))
      }
    },
    [],
  )

  const changeSemesterFilter = useCallback(
    (semester: string | number, mode: Mode) => {
      const parsedSemester = Number(semester)

      if (mode === 'add') {
        setSemester((old) => [...old, parsedSemester])
      } else if (mode === 'remove') {
        setSemester((old) => {
          return old.filter((s) => s !== parsedSemester)
        })
      }
    },
    [],
  )

  const changeBranchFilter = useCallback((branch: string, mode: Mode) => {
    if (mode === 'add') {
      setBranch((old) => [...old, branch])
    } else {
      setBranch((old) => old.filter((b) => b !== branch))
    }
  }, [])

  const changeNatureFilter = useCallback((nature: string, mode: Mode) => {
    if (mode === 'add') {
      setNature((old) => [...old, nature])
    } else {
      setNature((old) => old.filter((n) => n !== nature))
    }
  }, [])

  const changeQueryFilter = useCallback((query: string) => setQuery(query), [])

  const value = useMemo(
    () => ({
      query,
      duration,
      branch,
      nature,
      semester,

      changeQueryFilter,
      changeDurationFilter,
      changeSemesterFilter,
      changeBranchFilter,
      changeNatureFilter,
    }),
    [
      query,
      duration,
      branch,
      nature,
      semester,

      changeQueryFilter,
      changeDurationFilter,
      changeSemesterFilter,
      changeBranchFilter,
      changeNatureFilter,
    ],
  )

  return (
    <filterContext.Provider value={value}>{children}</filterContext.Provider>
  )
}

export function useFilter() {
  const context = useContext(filterContext)

  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider')
  }

  return context
}
