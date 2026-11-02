import { Controller, Get, Header, Inject, Param } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { slugSchema } from '@ufc-flow/contracts'

import {
  ApiJson,
  ApiProblems,
  arrayOf,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
import {
  GetPublicCourseUseCase,
  GetPublicCurriculumUseCase,
  ListCoursesUseCase,
  ListSigaaCoursesUseCase,
} from '../../application/courses.use-cases'

// Leitura pública, sem login, com cache no navegador e no proxy. O Express
// gera o ETag e responde 304 quando nada mudou.
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=600'

const slugParam = new ZodValidationPipe(slugSchema)

@ApiTags('catalog')
@Controller('v1')
export class PublicCatalogController {
  constructor(
    @Inject(ListCoursesUseCase)
    private readonly listCourses: ListCoursesUseCase,
    @Inject(GetPublicCourseUseCase)
    private readonly getCourse: GetPublicCourseUseCase,
    @Inject(GetPublicCurriculumUseCase)
    private readonly getCurriculum: GetPublicCurriculumUseCase,
    @Inject(ListSigaaCoursesUseCase)
    private readonly listSigaa: ListSigaaCoursesUseCase,
  ) {}

  @Get('courses')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Cursos ativos no Flow' })
  @ApiJson(200, 'Cursos em ordem alfabética', arrayOf('CourseSummary'))
  courses() {
    return this.listCourses.execute()
  }

  @Get('courses/:courseSlug')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Curso e suas estruturas publicadas',
    description: 'Rascunhos não aparecem.',
  })
  @ApiParam({ name: 'courseSlug', example: 'engenharia-de-computacao' })
  @ApiJson(200, 'Curso', schemaRef('CourseDetail'))
  @ApiProblems(400, 404)
  course(@Param('courseSlug', slugParam) courseSlug: string) {
    return this.getCourse.execute(courseSlug)
  }

  @Get('courses/:courseSlug/curricula/:curriculumSlug')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Estrutura curricular publicada',
    description:
      'Disciplinas com requisitos em expressão E/OU, equivalências e vertentes.',
  })
  @ApiParam({ name: 'courseSlug', example: 'engenharia-de-computacao' })
  @ApiParam({ name: 'curriculumSlug', example: '2006-2' })
  @ApiJson(200, 'Estrutura curricular', schemaRef('CurriculumDetail'))
  @ApiProblems(400, 404)
  curriculum(
    @Param('courseSlug', slugParam) courseSlug: string,
    @Param('curriculumSlug', slugParam) curriculumSlug: string,
  ) {
    return this.getCurriculum.execute(courseSlug, curriculumSlug)
  }

  @Get('sigaa-courses')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Catálogo de cursos do SIGAA',
    description:
      'Lista pública de cursos de graduação do SIGAA, com o curso do Flow criado a partir de cada um. A extensão usa para reconhecer o curso de uma estrutura.',
  })
  @ApiJson(200, 'Cursos do SIGAA', arrayOf('SigaaCourseEntry'))
  sigaaCourses() {
    return this.listSigaa.execute()
  }
}
