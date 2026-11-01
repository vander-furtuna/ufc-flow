import { collectCodes } from '../requirements/collect-codes'
import {
  isRequirementMet,
  isSubjectCompleted,
  type Equivalences,
} from '../requirements/evaluate-requirement'
import type { AvailableSubject, CurriculumRequirements } from './types'

type FindAvailableSubjectsInput = {
  subjects: readonly CurriculumRequirements[]
  // Disciplinas com APROVADO ou APROVEITADA
  completedCodes: ReadonlySet<string>
  // Disciplinas em CURSANDO
  inProgressCodes: ReadonlySet<string>
  equivalences?: Equivalences
}

// Disciplinas da EC que o aluno pode cursar: ainda não cumpridas nem em
// andamento, com o pré-requisito cumprido (CURSANDO não conta). O co-requisito
// não bloqueia: o que faltar dele vem em missingCorequisites, para cursar junto.
export function findAvailableSubjects({
  subjects,
  completedCodes,
  inProgressCodes,
  equivalences,
}: FindAvailableSubjectsInput): AvailableSubject[] {
  const takenOrTaking = new Set([...completedCodes, ...inProgressCodes])

  return subjects
    .filter(
      (subject) =>
        !inProgressCodes.has(subject.code) &&
        !isSubjectCompleted(subject.code, completedCodes, equivalences) &&
        isRequirementMet(subject.prerequisite, completedCodes, equivalences),
    )
    .map((subject) => ({
      code: subject.code,
      missingCorequisites: isRequirementMet(
        subject.corequisite,
        takenOrTaking,
        equivalences,
      )
        ? []
        : collectCodes(subject.corequisite).filter(
            (code) => !isSubjectCompleted(code, takenOrTaking, equivalences),
          ),
    }))
}
