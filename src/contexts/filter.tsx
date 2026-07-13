'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { normalizeWords } from '@/utils/normalize-words'
import { useParams } from 'next/navigation'
import { getFilters, setFilters } from '@/storage/indexed-db'

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
  isFiltersLoaded: boolean
}

const filterContext = createContext({} as FilterContextProps)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [queryFilter, setQueryFilter] = useState('')
  const [durationFilter, setDurationFilter] = useState<number[]>([])
  const [branchFilter, setBranchFilter] = useState<string[]>([])
  const [natureFilter, setNatureFilter] = useState<string[]>([])
  const [semesterFilter, setSemesterFilter] = useState<number[]>([])
  const [isFiltersLoaded, setIsFiltersLoaded] = useState(false)
  const [prevCourseSlug, setPrevCourseSlug] = useState<string | undefined>(
    undefined,
  )

  const params = useParams()
  const courseSlug =
    typeof params?.courseSlug === 'string' ? params.courseSlug : undefined

  if (courseSlug !== prevCourseSlug) {
    setPrevCourseSlug(courseSlug)
    setIsFiltersLoaded(!courseSlug)
  }

  useEffect(() => {
    if (!courseSlug) {
      return
    }

    let isMounted = true

    getFilters(courseSlug)
      .then((saved) => {
        if (!isMounted) return

        if (saved) {
          setQueryFilter(saved.queryFilter ?? '')
          setDurationFilter(saved.durationFilter ?? [])
          setBranchFilter(saved.branchFilter ?? [])
          setNatureFilter(saved.natureFilter ?? [])
          setSemesterFilter(saved.semesterFilter ?? [])
        } else {
          setQueryFilter('')
          setDurationFilter([])
          setBranchFilter([])
          setNatureFilter([])
          setSemesterFilter([])
        }
        setIsFiltersLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load filters', err)
        if (isMounted) {
          setIsFiltersLoaded(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [courseSlug])

  const loadedCourseSlugRef = useRef<string | null>(null)

  useEffect(() => {
    if (isFiltersLoaded && courseSlug) {
      loadedCourseSlugRef.current = courseSlug
    } else if (!courseSlug) {
      loadedCourseSlugRef.current = null
    }
  }, [isFiltersLoaded, courseSlug])

  useEffect(() => {
    if (!courseSlug || loadedCourseSlugRef.current !== courseSlug) {
      return
    }

    const filters = {
      queryFilter,
      durationFilter,
      branchFilter,
      natureFilter,
      semesterFilter,
    }

    setFilters(courseSlug, filters).catch((err) => {
      console.error('Failed to save filters', err)
    })
  }, [
    courseSlug,
    queryFilter,
    durationFilter,
    branchFilter,
    natureFilter,
    semesterFilter,
  ])

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
      isFiltersLoaded,
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
      isFiltersLoaded,
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
