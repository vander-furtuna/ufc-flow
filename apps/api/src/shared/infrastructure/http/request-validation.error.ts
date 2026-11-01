import type { z } from 'zod'

// Corpo, query ou parâmetro fora do schema do contracts
export class RequestValidationError extends Error {
  constructor(readonly zodError: z.ZodError) {
    super('Dados inválidos')
    this.name = 'RequestValidationError'
  }
}
