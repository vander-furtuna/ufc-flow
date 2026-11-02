import type { RequirementExpr } from '@ufc-flow/academic-core'
import type {
  ReviewPoint as ReviewPointView,
  ReviewResolution,
  SubjectWorkload,
} from '@ufc-flow/contracts'

import { CatalogErrors } from './errors'

type WithDates<T> = T extends unknown
  ? Omit<T, 'resolvedAt'> & { resolvedAt: Date | null }
  : never

// Ponto que uma importação deixa para revisar antes de publicar
export type ReviewPoint = WithDates<ReviewPointView>

export type ReviewPointType = ReviewPoint['type']

// O que resolver um ponto muda fora dele (na disciplina global)
export type ReviewEffect =
  | { kind: 'RENAME_SUBJECT'; code: string; name: string }
  | { kind: 'SET_WORKLOAD'; code: string; workload: SubjectWorkload }
  | { kind: 'SET_EQUIVALENCES'; code: string; equivalences: RequirementExpr }

const RESOLUTIONS: Record<ReviewPointType, readonly ReviewResolution[]> = {
  SUBJECT_NAME_MISMATCH: ['KEEP_CATALOG', 'USE_IMPORTED'],
  SUBJECT_WORKLOAD_MISMATCH: ['KEEP_CATALOG', 'USE_IMPORTED'],
  UNKNOWN_REQUIREMENT_CODE: ['ACKNOWLEDGED'],
  EQUIVALENCES_SUGGESTED: ['APPLY', 'IGNORE'],
}

// Equivalências sugeridas por moderador não barram a publicação: são
// globais e esperam um admin (D5)
export const isBlocking = (point: ReviewPoint) =>
  point.resolution === null && point.type !== 'EQUIVALENCES_SUGGESTED'

function effectOf(
  point: ReviewPoint,
  resolution: ReviewResolution,
): ReviewEffect | null {
  if (point.type === 'SUBJECT_NAME_MISMATCH' && resolution === 'USE_IMPORTED') {
    return {
      kind: 'RENAME_SUBJECT',
      code: point.code,
      name: point.importedName,
    }
  }
  if (
    point.type === 'SUBJECT_WORKLOAD_MISMATCH' &&
    resolution === 'USE_IMPORTED'
  ) {
    return { kind: 'SET_WORKLOAD', code: point.code, workload: point.imported }
  }
  if (point.type === 'EQUIVALENCES_SUGGESTED' && resolution === 'APPLY') {
    return {
      kind: 'SET_EQUIVALENCES',
      code: point.code,
      equivalences: point.suggested,
    }
  }
  return null
}

export function resolveReviewPoint(
  point: ReviewPoint,
  resolution: ReviewResolution,
  ctx: { isAdmin: boolean; now: Date },
): { point: ReviewPoint; effect: ReviewEffect | null } {
  if (point.resolution !== null) throw CatalogErrors.reviewPointResolved()
  if (!RESOLUTIONS[point.type].includes(resolution)) {
    throw CatalogErrors.invalidResolution()
  }
  if (point.type === 'EQUIVALENCES_SUGGESTED' && !ctx.isAdmin) {
    throw CatalogErrors.accessDenied()
  }
  return {
    point: { ...point, resolution, resolvedAt: ctx.now } as ReviewPoint,
    effect: effectOf(point, resolution),
  }
}
