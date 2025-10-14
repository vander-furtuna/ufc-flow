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

import { useFilter } from './filter'

type CourseContextType = {
  courses: Course[]
  selectedCourse: Course | null
  selectedCurriculum: CurriculumStructure | null
  selectedSubjects: Subject[]
  filteredSubjects: Subject[]
  selectedSubject: Subject | null
  isCourseLoading: boolean
  selectCourseBySlug: (slug: string) => void
  selectCurriculumBySlug: (slug: string) => void

  setSelectedSubject: (subject: Subject | null) => void
}

const courseContext = createContext<CourseContextType>({} as CourseContextType)

export function CourseProvider({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const {
    branchFilter,
    natureFilter,
    normalizedQueryFilter,
    semesterFilter,
    durationFilter,
  } = useFilter()

  const [isCourseLoading, setIsCourseLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedCurriculum, setSelectedCurriculum] =
    useState<CurriculumStructure | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([])

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

  const applyFilters = useCallback(() => {
    const filtered = selectedCurriculum?.subjects.filter((subject) => {
      if (normalizedQueryFilter.length > 0) {
        if (
          !normalizeWords(subject.name).includes(normalizedQueryFilter) &&
          !subject.code
            .toLowerCase()
            .includes(normalizedQueryFilter.toLowerCase())
        ) {
          return false
        }
      }
      if (durationFilter.length > 0) {
        if (!durationFilter.includes(subject.duration)) {
          return false
        }
      }

      if (branchFilter.length > 0) {
        if (!branchFilter.some((branch) => subject.branch.includes(branch))) {
          return false
        }
      }

      if (semesterFilter.length > 0) {
        if (!semesterFilter.includes(subject.semester)) {
          return false
        }
      }

      if (natureFilter.length > 0) {
        if (!natureFilter.includes(subject.nature)) {
          return false
        }
      }

      return true
    })

    if (filtered) {
      setFilteredSubjects(filtered)
    }
  }, [
    normalizedQueryFilter,
    durationFilter,
    branchFilter,
    semesterFilter,
    natureFilter,
    selectedCurriculum,
  ])

  useEffect(() => {
    setCourses(COURSES_DATA)
  }, [])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

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
