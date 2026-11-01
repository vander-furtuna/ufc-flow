import { DomainError } from './domain-error'

// Cursor opaco da paginação: posição do último item (data e id, para
// desempatar), em base64url. O cliente só repassa o nextCursor recebido.
export type CursorPosition = { createdAt: Date; id: string }

export function encodeCursor(position: CursorPosition): string {
  return Buffer.from(
    JSON.stringify([position.createdAt.toISOString(), position.id]),
  ).toString('base64url')
}

export function decodeCursor(
  cursor: string | undefined,
): CursorPosition | null {
  if (cursor === undefined) return null
  try {
    const [createdAt, id] = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as [string, string]
    const date = new Date(createdAt)
    if (typeof id !== 'string' || Number.isNaN(date.getTime())) {
      throw new Error()
    }
    return { createdAt: date, id }
  } catch {
    throw new DomainError(
      'INVALID_CURSOR',
      'INVALID',
      'Cursor de página inválido',
    )
  }
}

// Pede um item a mais para saber se há próxima página
export function pageOf<T extends CursorPosition, R>(
  rows: T[],
  limit: number,
  map: (row: T) => R,
): { items: R[]; nextCursor: string | null } {
  const items = rows.slice(0, limit)
  const last = items.at(-1)
  return {
    items: items.map(map),
    nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
  }
}
