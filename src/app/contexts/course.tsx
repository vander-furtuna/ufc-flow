'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { COURSES_DATA } from '@/data/courses'
import type { Course, CurriculumStructure, Subject } from '@/types/course'
import { normalizeWords } from '@/utils/normalize-words'

type FilterState = {
  query: string
  duration: number[]
  branch: string[]
  semester: number[]
  nature: string[]
}

interface CourseContextType {
  courses: Course[]
  selectedCourse: Course | null
  selectedCurriculum: CurriculumStructure | null
  selectedSubjects: Subject[]
  filteredSubjects: Subject[]
  selectedSubject: Subject | null
  isCourseLoading: boolean
  selectCourseBySlug: (slug: string) => void
  selectCurriculumBySlug: (slug: string) => void

  filters: FilterState
  setDurationFilter: (duration: string[] | number[]) => void
  setQueryFilter: (query: string) => void
  setBranchFilter: (branch: string[]) => void
  setSemesterFilter: (semester: string[] | number[]) => void
  setNatureFilter: (type: string[]) => void
  setSelectedSubject: (subject: Subject | null) => void
}

const courseContext = createContext<CourseContextType>({} as CourseContextType)

export function CourseProvider({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const [isCourseLoading, setIsCourseLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedCurriculum, setSelectedCurriculum] =
    useState<CurriculumStructure | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([])

  const [filters, setFilters] = useState<FilterState>({
    query: '',
    duration: [],
    branch: [],
    semester: [],
    nature: [],
  })

  const selectCourseBySlug = useCallback(
    (slug: string) => {
      const course = courses.find((course) => course.slug === slug)

      if (course) {
        setSelectedCourse(course)
      }
    },
    [courses],
  )

  const selectCurriculumBySlug = useCallback(
    (slug: string) => {
      if (selectedCourse) {
        setIsCourseLoading(true)
        const curriculum = selectedCourse.curriculumStructures.find(
          (curriculum) => curriculum.slug === slug,
        )

        if (curriculum) {
          setSelectedCurriculum(curriculum)
          setSelectedSubjects(curriculum.subjects)
          setFilteredSubjects(curriculum.subjects)
        }

        setIsCourseLoading(false)
      }
    },
    [selectedCourse],
  )

  const setQueryFilter = useCallback((query: string) => {
    setFilters((prev) => ({
      ...prev,
      query,
    }))
  }, [])

  const setDurationFilter = useCallback((duration: string[] | number[]) => {
    const numberDurationFilter = duration.map((duration) =>
      typeof duration === 'string' ? parseInt(duration) : duration,
    )

    setFilters((prev) => ({
      ...prev,
      duration: numberDurationFilter,
    }))
  }, [])

  const setSemesterFilter = useCallback((semester: string[] | number[]) => {
    const numberSemesterFilter = semester.map((semester) =>
      typeof semester === 'string' ? parseInt(semester) : semester,
    )

    setFilters((prev) => ({
      ...prev,
      semester: numberSemesterFilter,
    }))
  }, [])

  const setBranchFilter = useCallback((branch: string[]) => {
    setFilters((prev) => ({
      ...prev,
      branch,
    }))
  }, [])

  const setNatureFilter = useCallback((nature: string[]) => {
    setFilters((prev) => ({
      ...prev,
      nature,
    }))
  }, [])

  const applyFilters = useCallback(() => {
    const filtered = selectedCurriculum?.subjects.filter((subject) => {
      if (filters.query.length > 0) {
        if (
          !normalizeWords(subject.name).includes(
            normalizeWords(filters.query),
          ) &&
          !subject.code.toLowerCase().includes(filters.query.toLowerCase())
        ) {
          return false
        }
      }
      if (filters.duration.length > 0) {
        if (!filters.duration.includes(subject.duration)) {
          return false
        }
      }

      if (filters.branch.length > 0) {
        if (!filters.branch.some((branch) => subject.branch.includes(branch))) {
          return false
        }
      }

      if (filters.semester.length > 0) {
        if (!filters.semester.includes(subject.semester)) {
          return false
        }
      }

      if (filters.nature.length > 0) {
        if (!filters.nature.includes(subject.nature)) {
          return false
        }
      }

      return true
    })

    if (filtered) {
      setFilteredSubjects(filtered)
    }
  }, [filters, selectedCurriculum])

  useEffect(() => {
    setCourses(COURSES_DATA)
  }, [])

  useEffect(() => {
    applyFilters()
  }, [filters, applyFilters])

  const value = useMemo(
    () => ({
      courses,
      selectedCourse,
      selectedCurriculum,
      selectedSubjects,
      selectedSubject,
      filteredSubjects,
      isCourseLoading,
      selectCourseBySlug,
      selectCurriculumBySlug,

      filters,
      setDurationFilter,
      setQueryFilter,
      setBranchFilter,
      setSemesterFilter,
      setNatureFilter,
      setSelectedSubject,
    }),
    [
      courses,
      selectedCourse,
      selectedCurriculum,
      selectedSubjects,
      selectedSubject,
      filteredSubjects,
      isCourseLoading,
      selectCourseBySlug,
      selectCurriculumBySlug,

      filters,
      setDurationFilter,
      setQueryFilter,
      setBranchFilter,
      setSemesterFilter,
      setNatureFilter,
      setSelectedSubject,
    ],
  )

  return (
    <courseContext.Provider value={value}>{children}</courseContext.Provider>
  )
}

export function useCourse() {
  const context = useContext(courseContext)

  if (!context) {
    throw new Error('useCourse must be used within a CourseProvider')
  }

  return context
}
