'use client'

import { useCallback, useEffect } from 'react'

import { useCourse } from '@/app/contexts/course'
import { CurriculumHeader } from '@/components/curriculum-header'
import { Header } from '@/components/header'

import { Sidebar } from './components/sidebar/sidebax'
import { SubjectDiagram } from './components/subject-diagram'
import { SubjectDiagramSkeleton } from './components/subject-diagram-skeleton'

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
    isCourseLoading,
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
    <main className="flex w-full justify-center gap-6 px-8 md:gap-12">
      <section className="flex w-full max-w-5xl flex-col items-start justify-center gap-12 py-12 @container">
        <Header />
        <CurriculumHeader />
        {isCourseLoading ? <SubjectDiagramSkeleton /> : <SubjectDiagram />}
      </section>
      <Sidebar />
    </main>
  )
}
