// Quem está fazendo a ação. "Aluno do curso" não é papel gravado: é ter
// matrícula ativa no curso (preenchida a partir da fase 9).
export type Actor = {
  userId: string | null
  isAdmin: boolean
  moderatedCourseIds: ReadonlySet<string>
  enrolledCourseIds: ReadonlySet<string>
}

export const ANONYMOUS: Actor = {
  userId: null,
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(),
}

const isLoggedIn = (actor: Actor) => actor.userId !== null
const isStudentOf = (actor: Actor, courseId: string) =>
  actor.enrolledCourseIds.has(courseId)
const isModeratorOf = (actor: Actor, courseId: string) =>
  actor.moderatedCourseIds.has(courseId)
const managesCourse = (actor: Actor, courseId: string) =>
  actor.isAdmin || isModeratorOf(actor, courseId)

// Uma função por linha da Matriz de permissões. Os casos de uso checam por
// aqui, além do guard da rota.
export const AccessPolicy = {
  canViewPublicContent: () => true,
  canUseLocalSchedule: () => true,
  canSyncSchedules: isLoggedIn,
  canReadForum: isLoggedIn,
  canPostInForum: (actor: Actor, courseId: string) =>
    isStudentOf(actor, courseId) || managesCourse(actor, courseId),
  // Só o próprio aluno; moderador e admin não mexem em histórico alheio
  canManageOwnAcademicRecord: (actor: Actor, courseId: string) =>
    isStudentOf(actor, courseId),
  canEvaluateSubject: (actor: Actor, hasCompletedSubject: boolean) =>
    isLoggedIn(actor) && hasCompletedSubject,
  // Admin já pode tudo; moderador pede só para outros cursos
  canRequestModeration: (actor: Actor, courseId?: string) =>
    isLoggedIn(actor) &&
    !actor.isAdmin &&
    (courseId === undefined
      ? actor.moderatedCourseIds.size === 0
      : !isModeratorOf(actor, courseId)),
  canManageHub: managesCourse,
  canModerateForum: managesCourse,
  canManageCurricula: managesCourse,
  canAdministerPlatform: (actor: Actor) => actor.isAdmin,
}
