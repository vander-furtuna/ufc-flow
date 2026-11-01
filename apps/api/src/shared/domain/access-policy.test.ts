import { describe, expect, it } from 'vitest'

import { AccessPolicy, ANONYMOUS, type Actor } from './access-policy'

const COURSE = 'curso-a'
const OTHER = 'curso-b'

// Os cinco tipos de ator da Matriz de permissões (modelagem, Usuários,
// papéis e permissões)
const actors: Record<string, Actor> = {
  anonymous: ANONYMOUS,
  loggedIn: {
    userId: 'u1',
    isAdmin: false,
    moderatedCourseIds: new Set(),
    enrolledCourseIds: new Set(),
  },
  student: {
    userId: 'u2',
    isAdmin: false,
    moderatedCourseIds: new Set(),
    enrolledCourseIds: new Set([COURSE]),
  },
  moderator: {
    userId: 'u3',
    isAdmin: false,
    moderatedCourseIds: new Set([COURSE]),
    enrolledCourseIds: new Set(),
  },
  admin: {
    userId: 'u4',
    isAdmin: true,
    moderatedCourseIds: new Set(),
    enrolledCourseIds: new Set(),
  },
}

type Row = [
  rule: string,
  check: (actor: Actor) => boolean,
  expected: [boolean, boolean, boolean, boolean, boolean],
]

// Colunas: anônimo, logado, aluno do curso, moderador do curso, admin.
// "—" na matriz vira false: a ação não se aplica àquele papel.
const matrix: Row[] = [
  [
    'ver grade, turmas, hub e médias',
    () => AccessPolicy.canViewPublicContent(),
    [true, true, true, true, true],
  ],
  [
    'agenda local',
    () => AccessPolicy.canUseLocalSchedule(),
    [true, true, true, true, true],
  ],
  [
    'agenda sincronizada e preferências',
    (actor) => AccessPolicy.canSyncSchedules(actor),
    [false, true, true, true, true],
  ],
  [
    'ler o fórum',
    (actor) => AccessPolicy.canReadForum(actor),
    [false, true, true, true, true],
  ],
  [
    'postar, responder e curtir no fórum',
    (actor) => AccessPolicy.canPostInForum(actor, COURSE),
    [false, false, true, true, true],
  ],
  [
    'histórico e horas complementares próprios',
    (actor) => AccessPolicy.canManageOwnAcademicRecord(actor, COURSE),
    [false, false, true, false, false],
  ],
  [
    'avaliar disciplina concluída',
    (actor) => AccessPolicy.canEvaluateSubject(actor, true),
    [false, true, true, true, true],
  ],
  [
    'solicitar moderação',
    (actor) => AccessPolicy.canRequestModeration(actor),
    [false, true, true, false, false],
  ],
  [
    'gerir hub e página de links',
    (actor) => AccessPolicy.canManageHub(actor, COURSE),
    [false, false, false, true, true],
  ],
  [
    'moderar o fórum',
    (actor) => AccessPolicy.canModerateForum(actor, COURSE),
    [false, false, false, true, true],
  ],
  [
    'importar, editar e publicar EC; marcar vigente',
    (actor) => AccessPolicy.canManageCurricula(actor, COURSE),
    [false, false, false, true, true],
  ],
  [
    'criar curso, aprovar moderadores, gerir critérios e usuários',
    (actor) => AccessPolicy.canAdministerPlatform(actor),
    [false, false, false, false, true],
  ],
]

describe('AccessPolicy (Matriz de permissões)', () => {
  const columns = Object.keys(actors)
  it.each(matrix)('%s', (_, check, expected) => {
    expect(columns.map((name) => check(actors[name]!))).toEqual(expected)
  })

  it('o papel de aluno e de moderador vale só para o próprio curso', () => {
    expect(AccessPolicy.canPostInForum(actors.student!, OTHER)).toBe(false)
    expect(AccessPolicy.canManageHub(actors.moderator!, OTHER)).toBe(false)
    expect(
      AccessPolicy.canManageOwnAcademicRecord(actors.student!, OTHER),
    ).toBe(false)
  })

  it('avaliar exige ter concluído a disciplina', () => {
    expect(AccessPolicy.canEvaluateSubject(actors.student!, false)).toBe(false)
    expect(AccessPolicy.canEvaluateSubject(actors.admin!, false)).toBe(false)
  })

  it('moderador de um curso ainda pode pedir moderação de outro', () => {
    expect(AccessPolicy.canRequestModeration(actors.moderator!, OTHER)).toBe(
      true,
    )
    expect(AccessPolicy.canRequestModeration(actors.moderator!, COURSE)).toBe(
      false,
    )
  })
})
