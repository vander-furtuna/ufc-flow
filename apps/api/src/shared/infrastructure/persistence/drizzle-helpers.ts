import type { Database } from '../../../database/database.module'

// O cliente ou uma transação aberta por ele
export type Executor =
  Database | Parameters<Parameters<Database['transaction']>[0]>[0]

// Violação de UNIQUE do PostgreSQL (23505), vinda direto do pg ou embrulhada
// pelo Drizzle
function uniqueViolation(error: unknown): string | null {
  for (const candidate of [error, (error as { cause?: unknown })?.cause]) {
    const pgError = candidate as { code?: string; constraint?: string }
    if (pgError?.code === '23505') return pgError.constraint ?? ''
  }
  return null
}

export async function mapUnique<T>(
  work: Promise<T>,
  errors: Record<string, () => Error>,
): Promise<T> {
  try {
    return await work
  } catch (error) {
    const constraint = uniqueViolation(error)
    const mapped = constraint === null ? undefined : errors[constraint]
    throw mapped ? mapped() : error
  }
}
