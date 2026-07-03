import { COLORS, NATURE_COLORS } from '@/data/colors'
import type { Nature } from '@/types/course'

/**
 * Determines the glow color based on subject nature and branch colors.
 * For OPTATIVA subjects, prioritizes branch colors over the default OPTIONAL color.
 * For all other natures, uses the corresponding color from NATURE_COLORS.
 */
export function getGlowColor(
  nature: string | undefined,
  branchColors: string[] = [],
): string | string[] {
  if (!nature) return ''

  if (nature === 'OBRIGATÓRIA') {
    return COLORS.COMPULSORY
  }

  if (nature === 'OPTATIVA') {
    return branchColors.length > 0 ? branchColors : COLORS.OPTIONAL
  }

  return NATURE_COLORS[nature as Nature] ?? ''
}
