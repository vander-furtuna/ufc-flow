import type { Subject } from '@/types/course'

export const checkPrerequisites = (
  subject: Subject,
  completedSubjectCodes: string[],
): string[] => {
  const missing: string[] = []
  if (!subject.prerequisites) return missing

  for (const preReqCode of subject.prerequisites) {
    if (!completedSubjectCodes.includes(preReqCode)) {
      missing.push(preReqCode)
    }
  }
  return missing
}
