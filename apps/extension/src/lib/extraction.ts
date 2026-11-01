import type { SigaaCourse } from '@ufc-flow/academic-core'
import type { CurriculumImportV1 } from '@ufc-flow/contracts'

import embeddedCatalog from '../sigaa/catalog/sigaa-courses.json'
import {
  formatCourseName,
  mergeCatalog,
  resolveCourse,
  type CourseResolution,
} from '../sigaa/course'
import {
  readCurriculumPage,
  type CurriculumPage,
} from '../sigaa/read-curriculum-page'
import { canExport, reviewImport, type ReviewItem } from '../sigaa/review'
import { toCurriculumImport } from '../sigaa/to-curriculum-import'
import type { SearchCapture } from './search-capture'

// Resumo da estrutura aberta, para o popup e o botão flutuante
export type ExtractionSummary = {
  courseName: string
  code: string
  city: string
  sigaaId: string | null
  components: number
  branches: number
  // Itens da revisão com aviso ou erro
  toReview: number
}

export type Extraction = {
  page: CurriculumPage
  catalog: SigaaCourse[]
  course: CourseResolution
  // Sempre gerado quando a página é válida, para mostrar a grade; só sai do
  // navegador se exportable
  data: CurriculumImportV1 | null
  review: ReviewItem[]
  exportable: boolean
  summary: ExtractionSummary
}

// Nome provisório enquanto o curso não é decidido: a matriz até o 1º " - "
const provisionalName = (matrixName: string) =>
  formatCourseName(matrixName.split(' - ')[0] ?? matrixName)

export function extractCurriculum({
  doc,
  search,
  manualCourseId,
  now,
  url,
}: {
  doc: Document
  search: SearchCapture
  manualCourseId: string | null
  now: Date
  url: string | null
}): Extraction | null {
  const page = readCurriculumPage(doc)
  if (!page) return null

  const catalog = mergeCatalog(embeddedCatalog as SigaaCourse[], search.courses)
  const course = resolveCourse({
    header: page.header,
    catalog,
    selectedCourseId: search.selectedCourseId,
    manualCourseId,
  })
  const courseName = course.course
    ? formatCourseName(course.course.name)
    : provisionalName(page.header.matrixName)

  const conversion = toCurriculumImport(page, {
    course: {
      sigaaId: course.course?.sigaaId ?? '0',
      name: courseName,
      recognition: course.recognition ?? 'MANUAL',
    },
    curriculumSigaaId:
      search.curriculum?.code === page.header.code
        ? search.curriculum.sigaaId
        : null,
    extractedAt: now.toISOString(),
    url,
  })
  const review = reviewImport({ ...conversion, course })

  return {
    page,
    catalog,
    course,
    data: conversion.data,
    review,
    exportable: conversion.data !== null && canExport(review),
    summary: {
      courseName,
      code: page.header.code,
      city: page.header.city,
      sigaaId: course.course?.sigaaId ?? null,
      components: page.components.length,
      branches: conversion.data?.branches.length ?? 0,
      toReview: review.filter((item) => item.level !== 'ok').length,
    },
  }
}
