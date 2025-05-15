'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { normalizeWords } from '@/utils/normalize-words'

type Mode = 'add' | 'remove'

type FilterContextProps = {
  queryFilter: string
  normalizedQueryFilter: string
  durationFilter: number[]
  branchFilter: string[]
  natureFilter: string[]
  semesterFilter: number[]

  changeQueryFilter: (query: string) => void
  changeDurationFilter: (duration: string | number, mode: Mode) => void
  changeBranchFilter: (branch: string, mode: Mode) => void
  changeSemesterFilter: (semester: string | number, mode: Mode) => void
  changeNatureFilter: (nature: string, mode: Mode) => void

  setDurationFilter: (duration: number[]) => void
  setQueryFilter: (query: string) => void
  setBranchFilter: (branch: string[]) => void
  setSemesterFilter: (semester: number[]) => void
  setNatureFilter: (nature: string[]) => void

  isFiltersActive: boolean
  clearAllFilters: () => void
}

const filterContext = createContext({} as FilterContextProps)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [queryFilter, setQueryFilter] = useState('')
  const [durationFilter, setDurationFilter] = useState<number[]>([])
  const [branchFilter, setBranchFilter] = useState<string[]>([])
  const [natureFilter, setNatureFilter] = useState<string[]>([])
  const [semesterFilter, setSemesterFilter] = useState<number[]>([])

  const normalizedQueryFilter = useMemo(
    () => normalizeWords(queryFilter),
    [queryFilter],
  )

  const changeDurationFilter = useCallback(
    (duration: string | number, mode: Mode) => {
      const parsedDuration = Number(duration)

      if (mode === 'add') {
        setDurationFilter((old) => [...old, parsedDuration])
      } else {
        setDurationFilter((old) => old.filter((d) => d !== parsedDuration))
      }
    },
    [],
  )

  const changeSemesterFilter = useCallback(
    (semester: string | number, mode: Mode) => {
      const parsedSemester = Number(semester)

      if (mode === 'add') {
        setSemesterFilter((old) => [...old, parsedSemester])
      } else if (mode === 'remove') {
        setSemesterFilter((old) => {
          return old.filter((s) => s !== parsedSemester)
        })
      }
    },
    [],
  )

  const changeBranchFilter = useCallback((branch: string, mode: Mode) => {
    if (mode === 'add') {
      setBranchFilter((old) => [...old, branch])
    } else {
      setBranchFilter((old) => old.filter((b) => b !== branch))
    }
  }, [])

  const changeNatureFilter = useCallback((nature: string, mode: Mode) => {
    if (mode === 'add') {
      setNatureFilter((old) => [...old, nature])
    } else {
      setNatureFilter((old) => old.filter((n) => n !== nature))
    }
  }, [])

  const changeQueryFilter = useCallback(
    (query: string) => setQueryFilter(query),
    [],
  )

  const clearAllFilters = useCallback(() => {
    setQueryFilter('')
    setDurationFilter([])
    setBranchFilter([])
    setSemesterFilter([])
    setNatureFilter([])
  }, [])

  const isFiltersActive = useMemo(() => {
    return (
      queryFilter !== '' ||
      durationFilter.length > 0 ||
      branchFilter.length > 0 ||
      natureFilter.length > 0 ||
      semesterFilter.length > 0
    )
  }, [queryFilter, durationFilter, branchFilter, natureFilter, semesterFilter])

  const value = useMemo(
    () => ({
      queryFilter,
      normalizedQueryFilter,
      durationFilter,
      branchFilter,
      natureFilter,
      semesterFilter,

      changeQueryFilter,
      changeDurationFilter,
      changeSemesterFilter,
      changeBranchFilter,
      changeNatureFilter,

      setQueryFilter,
      setDurationFilter,
      setSemesterFilter,
      setBranchFilter,
      setNatureFilter,

      isFiltersActive,
      clearAllFilters,
    }),
    [
      queryFilter,
      normalizedQueryFilter,
      durationFilter,
      branchFilter,
      natureFilter,
      semesterFilter,

      changeQueryFilter,
      changeDurationFilter,
      changeSemesterFilter,
      changeBranchFilter,
      changeNatureFilter,

      setQueryFilter,
      setDurationFilter,
      setSemesterFilter,
      setBranchFilter,
      setNatureFilter,

      isFiltersActive,
      clearAllFilters,
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
