import type { Subject } from '@/types/course'

export const checkPrerequisites = (
  subject: Subject,
  completedSubjectCodes: string[],
  allSubjects: Subject[] = [],
): string[] => {
  const missing: string[] = []
  if (!subject.prerequisites) return missing

  for (const preReqCode of subject.prerequisites) {
    if (completedSubjectCodes.includes(preReqCode)) {
      continue
    }

    // Check if there is a completed subject that lists preReqCode in its equivalences
    const hasEquivalentCompleted = allSubjects.some(
      (s) =>
        completedSubjectCodes.includes(s.code) &&
        s.equivalences?.includes(preReqCode),
    )

    if (hasEquivalentCompleted) {
      continue
    }

    // Check if the prerequisite subject itself lists a completed subject in its equivalences
    const prereqSubject = allSubjects.find((s) => s.code === preReqCode)
    const hasCompletedEquivalent = prereqSubject?.equivalences?.some((eqCode) =>
      completedSubjectCodes.includes(eqCode),
    )

    if (hasCompletedEquivalent) {
      continue
    }

    missing.push(preReqCode)
  }
  return missing
}
