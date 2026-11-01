import { collectCodes } from '../requirements/collect-codes'
import { isSubjectCompleted } from '../requirements/evaluate-requirement'
import type {
  ActivityKind,
  ActivityRecord,
  HoursProgress,
  IntegrationProgress,
  ProgressCurriculum,
  ProgressInput,
} from './types'

const hours = (
  requiredHours: number,
  completedHours: number,
): HoursProgress => ({
  requiredHours,
  completedHours,
  met: completedHours >= requiredHours,
})

const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0)

// Horas das atividades de um tipo, somadas por categoria com o teto dela.
// Atividades sem categoria não têm teto.
function activityHours(
  curriculum: ProgressCurriculum,
  activities: readonly ActivityRecord[],
  kind: ActivityKind,
) {
  const maxHours = new Map(
    curriculum.activityCategories.map((category) => [
      category.id,
      category.maxHours,
    ]),
  )

  const declared = new Map<string | null, number>()
  for (const activity of activities) {
    if (activity.kind !== kind) continue
    declared.set(
      activity.categoryId,
      (declared.get(activity.categoryId) ?? 0) + activity.hours,
    )
  }

  return [...declared].map(([categoryId, declaredHours]) => {
    const cap = categoryId === null ? null : (maxHours.get(categoryId) ?? null)
    return {
      categoryId,
      declaredHours,
      countedHours: cap === null ? declaredHours : Math.min(declaredHours, cap),
    }
  })
}

// Progresso de integralização calculado sob demanda. Uma disciplina da EC é
// cumprida por ela mesma ou por uma equivalente, sempre com a carga da EC; a
// equivalente usada não conta de novo. As demais cumpridas, fora da EC, contam
// como optativas livres até max_free_optative_hours.
export function computeProgress({
  curriculum,
  completedSubjects,
  activities,
  equivalences,
}: ProgressInput): IntegrationProgress {
  const completedCodes = new Set(completedSubjects.map((item) => item.code))
  const curriculumCodes = new Set(curriculum.subjects.map((item) => item.code))

  const satisfied = curriculum.subjects.filter((item) =>
    isSubjectCompleted(item.code, completedCodes, equivalences),
  )

  // Equivalentes usadas para cumprir disciplinas da EC não feitas diretamente
  const consumed = new Set<string>()
  for (const item of satisfied) {
    if (completedCodes.has(item.code)) continue
    for (const code of collectCodes(equivalences?.get(item.code) ?? null)) {
      if (completedCodes.has(code)) consumed.add(code)
    }
  }

  const free = completedSubjects.filter(
    (item) => !curriculumCodes.has(item.code) && !consumed.has(item.code),
  )

  const mandatoryHours = sum(
    satisfied
      .filter((item) => item.nature === 'MANDATORY')
      .map((item) => item.workloadHours),
  )
  const curriculumOptativeHours = sum(
    satisfied
      .filter((item) => item.nature === 'OPTATIVE')
      .map((item) => item.workloadHours),
  )
  const declaredFreeHours = sum(free.map((item) => item.workloadHours))
  const freeHours = Math.min(declaredFreeHours, curriculum.maxFreeOptativeHours)
  const optativeHours = curriculumOptativeHours + freeHours

  // Vertentes: as disciplinas de uma subvertente contam também para as mães
  const parentOf = new Map(
    curriculum.branches.map((branch) => [branch.id, branch.parentId]),
  )
  const branchSubjects = new Map<string, Set<string>>()
  for (const item of satisfied) {
    for (const branchId of item.branchIds ?? []) {
      let current: string | null | undefined = branchId
      const visited = new Set<string>()
      while (current && !visited.has(current)) {
        visited.add(current)
        const codes = branchSubjects.get(current) ?? new Set<string>()
        codes.add(item.code)
        branchSubjects.set(current, codes)
        current = parentOf.get(current)
      }
    }
  }
  const workloadOf = new Map(
    curriculum.subjects.map((item) => [item.code, item.workloadHours]),
  )
  const branches = curriculum.branches.map((branch) => {
    const codes = [...(branchSubjects.get(branch.id) ?? [])]
    const completedHours = sum(codes.map((code) => workloadOf.get(code) ?? 0))
    const completedComponents = codes.length
    return {
      branchId: branch.id,
      minHours: branch.minHours,
      minComponents: branch.minComponents,
      completedHours,
      completedComponents,
      met:
        (branch.minHours === null || completedHours >= branch.minHours) &&
        (branch.minComponents === null ||
          completedComponents >= branch.minComponents),
    }
  })

  const byCategory = activityHours(curriculum, activities, 'COMPLEMENTARY')
  const complementaryHours = sum(byCategory.map((item) => item.countedHours))

  const fromSubjectsHours = sum([
    ...satisfied.map((item) => item.extensionHours),
    ...free.map((item) => item.extensionHours),
  ])
  const fromActivitiesHours = sum(
    activityHours(curriculum, activities, 'EXTENSION').map(
      (item) => item.countedHours,
    ),
  )

  // As horas de extensão das disciplinas já estão na carga delas; no total
  // entram só as atividades de extensão. Complementares contam até o exigido.
  const totalHours =
    mandatoryHours +
    optativeHours +
    Math.min(complementaryHours, curriculum.complementaryActivityHours) +
    fromActivitiesHours

  return {
    mandatory: hours(curriculum.mandatoryHours, mandatoryHours),
    optative: {
      ...hours(curriculum.optativeHours, optativeHours),
      curriculumHours: curriculumOptativeHours,
      freeHours,
      freeHoursOverCap: declaredFreeHours - freeHours,
    },
    branches,
    complementary: {
      ...hours(curriculum.complementaryActivityHours, complementaryHours),
      byCategory,
    },
    extension: {
      ...hours(
        curriculum.extensionHours,
        fromSubjectsHours + fromActivitiesHours,
      ),
      fromSubjectsHours,
      fromActivitiesHours,
    },
    total: hours(curriculum.minTotalHours, totalHours),
  }
}
