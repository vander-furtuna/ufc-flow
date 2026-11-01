import { Controller, Get, Inject, Injectable, Module } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CourseSummary } from '@ufc-flow/contracts'
import { asc, eq } from 'drizzle-orm'

import { DATABASE, type Database } from '../../database/database.module'
import { ApiJson, arrayOf } from '../../shared/infrastructure/http/openapi'
import { courses } from './infrastructure/persistence/catalog.schema'

// Catálogo mínimo da fase 4: a lista de cursos, para o pedido de moderação.
// A fase 5 traz o módulo completo, com as camadas da arquitetura.
@Injectable()
export class ListCoursesQuery {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  execute(): Promise<CourseSummary[]> {
    return this.db
      .select({ id: courses.id, slug: courses.slug, name: courses.name })
      .from(courses)
      .where(eq(courses.isActive, true))
      .orderBy(asc(courses.name))
  }
}

@ApiTags('catalog')
@Controller('v1/courses')
export class CoursesController {
  constructor(
    @Inject(ListCoursesQuery) private readonly listCourses: ListCoursesQuery,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Cursos ativos no Flow' })
  @ApiJson(200, 'Cursos em ordem alfabética', arrayOf('CourseSummary'))
  list() {
    return this.listCourses.execute()
  }
}

@Module({ controllers: [CoursesController], providers: [ListCoursesQuery] })
export class CatalogModule {}
