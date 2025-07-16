'use client'

import { useCallback, useEffect } from 'react'

import { CurriculumHeader } from '@/components/curriculum-header'
import { Header } from '@/components/header'
import { useCourse } from '@/contexts/course'

import { Footer } from './footer'
import { Sidebar } from './sidebar/sidebax'
import { SubjectDiagram } from './subject-diagram'
import { SubjectDiagramSkeleton } from './subject-diagram-skeleton'

interface CurriculumProps {
  params: {
    courseSlug: string
    curriculumSlug: string
  }
}

export function CurriculumSection({ params }: CurriculumProps) {
  const { courseSlug, curriculumSlug } = params

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
        selectCourseBySlug(courseSlug)
      }

      if (selectedCourse) {
        selectCurriculumBySlug(curriculumSlug)
      }
    }

    return null
  }, [
    courseSlug,
    curriculumSlug,
    selectedCourse,
    selectedCurriculum,
    selectCourseBySlug,
    selectCurriculumBySlug,
  ])

  useEffect(() => {
    handleGetSelectedCurriculumBySlug()
    console.log('handleGetSelectedCurriculumBySlug called')
  }, [handleGetSelectedCurriculumBySlug])

  return (
    <>
      <section className="@container flex h-full min-h-dvh w-full max-w-5xl flex-col items-center justify-start gap-12 pt-12 pb-24">
        <Header />
        <CurriculumHeader />
        {isCourseLoading ? <SubjectDiagramSkeleton /> : <SubjectDiagram />}
        <Footer />
      </section>
      <Sidebar />
    </>
  )
}
