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
import type { Course, CurriculumStructure } from '@/types/course'

interface CourseContextType {
  courses: Course[]
  selectedCourse: Course | null
  selectedCurriculum: CurriculumStructure | null
  selectCourseBySlug: (slug: string) => void
  selectCurriculumBySlug: (slug: string) => void
}

const courseContext = createContext<CourseContextType>({} as CourseContextType)

export function CourseProvider({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedCurriculum, setSelectedCurriculum] =
    useState<CurriculumStructure | null>(null)

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
        const curriculum = selectedCourse.curriculumStructures.find(
          (curriculum) => curriculum.slug === slug,
        )

        if (curriculum) {
          setSelectedCurriculum(curriculum)
        }
      }
    },
    [selectedCourse],
  )

  useEffect(() => {
    setCourses(COURSES_DATA)
  }, [])

  const value = useMemo(
    () => ({
      courses,
      selectedCourse,
      selectedCurriculum,
      selectCourseBySlug,
      selectCurriculumBySlug,
    }),
    [
      courses,
      selectedCourse,
      selectedCurriculum,
      selectCourseBySlug,
      selectCurriculumBySlug,
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
