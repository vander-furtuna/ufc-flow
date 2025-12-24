'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { COURSES_DATA } from '@/data/courses'
import type { Course, CurriculumStructure, Subject } from '@/types/course'
import { normalizeWords } from '@/utils/normalize-words'

import { useFilter } from './filter'
import { useRouter } from 'next/navigation'

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
  handleSelect: (props: HandleSelectProps) => void
}

type HandleSelectProps = {
  courseSlug: string
  curriculumSlug: string
  subjectCode: string
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

  const courses = COURSES_DATA
  const [isCourseLoading, setIsCourseLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedCurriculum, setSelectedCurriculum] =
    useState<CurriculumStructure | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

  const router = useRouter()

  const selectCourseBySlug = useCallback(
    (slug: string) => {
      const course = courses.find((course) => course.slug === slug)

      if (course) {
        setSelectedCourse(course)
        setSelectedCurriculum(null)
        setSelectedSubjects([])
        setSelectedSubject(null)
        setIsCourseLoading(true)
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
        }

        setIsCourseLoading(false)
      }
    },
    [selectedCourse],
  )

  const handleSelect = useCallback(
    ({ courseSlug, curriculumSlug, subjectCode }: HandleSelectProps) => {
      selectCourseBySlug(courseSlug)
      selectCurriculumBySlug(curriculumSlug)
      if (selectedCurriculum) {
        const subject = selectedCurriculum.subjects.find(
          (subject) => subject.code === subjectCode,
        )
        if (subject) {
          setSelectedSubject(subject)
        } else {
          router.push(`/`)
        }
      }
    },
    [selectCourseBySlug, selectCurriculumBySlug, selectedCurriculum, router],
  )

  const filteredSubjects = useMemo(() => {
    if (!selectedCurriculum) return []

    const hasQuery = normalizedQueryFilter.length > 0
    const normalizedQueryLower = normalizedQueryFilter.toLowerCase()

    const hasDurationFilter = durationFilter.length > 0
    const hasBranchFilter = branchFilter.length > 0
    const hasSemesterFilter = semesterFilter.length > 0
    const hasNatureFilter = natureFilter.length > 0

    const matchesFilters = (subject: Subject) => {
      if (hasQuery) {
        const normalizedName = normalizeWords(subject.name)
        const codeLower = subject.code.toLowerCase()

        if (
          !normalizedName.includes(normalizedQueryFilter) &&
          !codeLower.includes(normalizedQueryLower)
        ) {
          return false
        }
      }

      if (hasDurationFilter && !durationFilter.includes(subject.duration)) {
        return false
      }

      if (
        hasBranchFilter &&
        !branchFilter.some((branch) => subject.branch.includes(branch))
      ) {
        return false
      }

      if (hasSemesterFilter && !semesterFilter.includes(subject.semester)) {
        return false
      }

      if (hasNatureFilter && !natureFilter.includes(subject.nature)) {
        return false
      }

      return true
    }

    return selectedCurriculum.subjects.filter(matchesFilters)
  }, [
    selectedCurriculum,
    normalizedQueryFilter,
    durationFilter,
    branchFilter,
    semesterFilter,
    natureFilter,
  ])

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
      handleSelect,
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
      handleSelect,
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
