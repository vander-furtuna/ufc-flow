import {
  Catch,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Request, Response } from 'express'

import { toProblem } from './to-problem'

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails')

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()
    const problem = toProblem(
      exception,
      request.originalUrl.split('?')[0] ?? '',
    )
    if (problem.status >= 500) this.logger.error(exception)
    response
      .status(problem.status)
      .type('application/problem+json')
      .json(problem)
  }
}
