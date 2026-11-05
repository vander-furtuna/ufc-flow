import type {
  CourseSummary,
  ModeratorRequestStatus,
  PersonalDataExport,
  UserRole,
  UserStatus,
} from '@ufc-flow/contracts'

import type { FileAttachmentRepository } from '../../files/domain/ports'
import type { ModeratorRequest } from './moderator-request'
import type { PasswordResetToken } from './password-reset-token'
import type { Session } from './session'

export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  status: UserStatus
  // Foto de perfil (arquivo AVATAR ligado); ausente é sem foto
  avatarFileId?: string | null
  createdAt: Date
  updatedAt: Date
}

export type Consent = {
  id: string
  userId: string
  document: 'TERMS' | 'PRIVACY'
  version: string
  acceptedAt: Date
}

export type AuditEntry = {
  id: string
  actorId: string | null
  module: string
  entity: string
  entityId: string
  action: string
  changes: Record<string, unknown> | null
  createdAt: Date
}

export type CourseModerator = {
  id: string
  userId: string
  courseId: string
  requestId: string
  grantedBy: string | null
  grantedAt: Date
}

export type ModeratorRequestRecord = ModeratorRequest & {
  user: { id: string; name: string; email: string }
  course: CourseSummary
}

export type RequestPageQuery = {
  status: ModeratorRequestStatus | null
  // Itens criados antes deste ponto (paginação por cursor)
  before: { createdAt: Date; id: string } | null
  limit: number
}

// Linha da busca do admin (Admin › Usuários)
export type UserListing = {
  id: string
  name: string
  email: string
  status: UserStatus
  roles: UserRole[]
  evaluationCount: number
  createdAt: Date
}

export type UserSearchQuery = {
  // Parte do nome ou do e-mail, sem diferenciar maiúsculas
  text: string | null
  status: UserStatus | null
  before: { createdAt: Date; id: string } | null
  limit: number
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  insert(user: User): Promise<void>
  updatePassword(userId: string, passwordHash: string, at: Date): Promise<void>
  setAvatar(userId: string, fileId: string | null, at: Date): Promise<void>
  rolesOf(userId: string): Promise<UserRole[]>
  // Cursos da matrícula atual e ativa: é o que faz de alguém aluno do curso
  enrolledCourseIds(userId: string): Promise<string[]>
  addRole(
    userId: string,
    role: UserRole,
    grantedBy: string | null,
    at: Date,
  ): Promise<void>
  insertConsents(consents: Consent[]): Promise<void>
  consentsOf(userId: string): Promise<Consent[]>
  setStatus(userId: string, status: UserStatus, at: Date): Promise<void>
  countAdmins(): Promise<number>
  // Das contas mais novas às mais antigas; pede um item a mais (pageOf)
  search(query: UserSearchQuery): Promise<UserListing[]>
}

// Seções da exportação (GET /me/export), sem a conta e o cabeçalho
export type PersonalDataSections = Omit<
  PersonalDataExport,
  'format' | 'exportedAt' | 'account'
>

// Dados da pessoa espalhados pelos módulos (LGPD)
export interface PersonalDataStore {
  collect(userId: string): Promise<PersonalDataSections>
  // Anonimiza o que é da comunidade (fórum, denúncias, contadores de
  // curtidas, notificações de terceiros) e apaga a conta; o resto sai pelas
  // FKs (CASCADE nos dados pessoais, SET NULL na autoria)
  erase(userId: string, now: Date): Promise<void>
}

export interface SessionRepository {
  findByTokenHash(hash: string): Promise<Session | null>
  insert(session: Session): Promise<void>
  update(session: Session): Promise<void>
  revokeFamily(familyId: string, at: Date): Promise<void>
  revokeAllOfUser(userId: string, at: Date): Promise<void>
}

export interface PasswordResetTokenRepository {
  findByTokenHash(hash: string): Promise<PasswordResetToken | null>
  insert(token: PasswordResetToken): Promise<void>
  update(token: PasswordResetToken): Promise<void>
  // Um link novo invalida os anteriores ainda abertos
  expireOpenOfUser(userId: string, at: Date): Promise<void>
}

export interface ModerationRepository {
  findRequest(id: string): Promise<ModeratorRequestRecord | null>
  insertRequest(request: ModeratorRequest): Promise<void>
  updateRequest(request: ModeratorRequest): Promise<void>
  hasPendingRequest(userId: string, courseId: string): Promise<boolean>
  listRequests(query: RequestPageQuery): Promise<ModeratorRequestRecord[]>
  listRequestsOfUser(userId: string): Promise<ModeratorRequestRecord[]>
  insertModerator(moderator: CourseModerator): Promise<void>
  isActiveModerator(userId: string, courseId: string): Promise<boolean>
  moderatedCourses(userId: string): Promise<CourseSummary[]>
}

export interface CourseLookup {
  findById(id: string): Promise<CourseSummary | null>
}

export interface AuditLog {
  record(entry: AuditEntry): Promise<void>
}

export type IdentityRepositories = {
  users: UserRepository
  sessions: SessionRepository
  resetTokens: PasswordResetTokenRepository
  moderation: ModerationRepository
  courses: CourseLookup
  audit: AuditLog
  // Arquivos ligados na mesma transação (foto de perfil)
  files: FileAttachmentRepository
  personalData: PersonalDataStore
}

// Tudo que um caso de uso grava dentro de run() é atômico
export interface IdentityUnitOfWork {
  run<T>(work: (repositories: IdentityRepositories) => Promise<T>): Promise<T>
}

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
}

// Token de acesso (JWT de 15 min no adaptador)
export interface AccessTokens {
  issue(
    claims: { userId: string },
    now: Date,
  ): Promise<{ token: string; expiresAt: Date }>
  verify(token: string): Promise<{ userId: string } | null>
}

// Tokens opacos (renovação e redefinição): só o hash vai para o banco
export interface OpaqueTokens {
  generate(): { token: string; hash: string }
  hash(token: string): string
}

export const IDENTITY_UOW = Symbol('IdentityUnitOfWork')
export const PASSWORD_HASHER = Symbol('PasswordHasher')
export const ACCESS_TOKENS = Symbol('AccessTokens')
export const OPAQUE_TOKENS = Symbol('OpaqueTokens')
