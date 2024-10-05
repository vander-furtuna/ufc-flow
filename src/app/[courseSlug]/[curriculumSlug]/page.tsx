'use client'

import { useCallback, useEffect } from 'react'

import { useCourse } from '@/app/contexts/course'
import { Header } from '@/components/header'

interface CurriculumProps {
  params: {
    courseSlug: string
    curriculumSlug: string
  }
}

export default function Curriculum({ params }: CurriculumProps) {
  const {
    selectedCourse,
    selectedCurriculum,
    selectCourseBySlug,
    selectCurriculumBySlug,
  } = useCourse()

  const handleGetSelectedCurriculumBySlug = useCallback(() => {
    if (!selectedCurriculum) {
      if (!selectedCourse) {
        selectCourseBySlug(params.courseSlug)
      }

      if (selectedCourse) {
        selectCurriculumBySlug(params.curriculumSlug)
      }
    }

    return null
  }, [
    params.courseSlug,
    params.curriculumSlug,
    selectedCourse,
    selectedCurriculum,
    selectCourseBySlug,
    selectCurriculumBySlug,
  ])

  useEffect(() => {
    handleGetSelectedCurriculumBySlug()
  }, [handleGetSelectedCurriculumBySlug])

  return (
    <main className="w-full justify-center items-start max-w-5xl py-12">
      <Header />
    </main>
  )
}
