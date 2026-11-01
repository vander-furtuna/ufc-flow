import type { PipeTransform } from '@nestjs/common'
import type { z } from 'zod'

import { RequestValidationError } from './request-validation.error'

// Valida a entrada com o schema do packages/contracts:
// @Body(new ZodValidationPipe(signUpInputSchema))
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value)
    if (!result.success) throw new RequestValidationError(result.error)
    return result.data
  }
}
