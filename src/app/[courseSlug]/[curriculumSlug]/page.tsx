'use client'

import { use, useCallback, useEffect } from 'react'

import { useCourse } from '@/app/contexts/course'
import { CurriculumHeader } from '@/components/curriculum-header'
import { Header } from '@/components/header'

import { Footer } from './components/footer'
import { Sidebar } from './components/sidebar/sidebax'
import { SubjectDiagram } from './components/subject-diagram'
import { SubjectDiagramSkeleton } from './components/subject-diagram-skeleton'

interface CurriculumProps {
  params: Promise<{
    courseSlug: string
    curriculumSlug: string
  }>
}

export default function Curriculum(props: CurriculumProps) {
  const params = use(props.params)
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
    <main className="flex h-full min-h-dvh w-full items-start justify-center gap-6 px-8 md:gap-12">
      <section className="@container flex h-full min-h-dvh w-full max-w-5xl flex-col items-center justify-start gap-12 pt-12 pb-24">
        {/* <FloatingBar /> */}
        <Header />
        <CurriculumHeader />
        {isCourseLoading ? <SubjectDiagramSkeleton /> : <SubjectDiagram />}
        <Footer />
      </section>
      <Sidebar />
    </main>
  )
}
