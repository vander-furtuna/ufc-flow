import type { CourseSummary, UserRole } from '@ufc-flow/contracts'

import type { Clock } from '../../../../shared/domain/clock'
import type { IdGenerator } from '../../../../shared/domain/id-generator'
import type { FileRecord } from '../../../files/domain/file'
import type { ModeratorRequest } from '../../domain/moderator-request'
import type { PasswordResetToken } from '../../domain/password-reset-token'
import type {
  AccessTokens,
  AuditEntry,
  Consent,
  CourseModerator,
  IdentityRepositories,
  IdentityUnitOfWork,
  ModeratorRequestRecord,
  OpaqueTokens,
  PasswordHasher,
  User,
} from '../../domain/ports'
import type { Session } from '../../domain/session'
import type { IdentitySettings } from '../identity-settings'

// Implementações em memória das portas, para testar os casos de uso sem
// banco e sem Nest
export class InMemoryIdentity implements IdentityUnitOfWork {
  users = new Map<string, User>()
  roles = new Map<string, UserRole[]>()
  consents: Consent[] = []
  sessions = new Map<string, Session>()
  resetTokens = new Map<string, PasswordResetToken>()
  requests = new Map<string, ModeratorRequest>()
  moderators: (CourseModerator & { revokedAt: Date | null })[] = []
  courses = new Map<string, CourseSummary>()
  enrolledCourses = new Map<string, string[]>()
  auditEntries: AuditEntry[] = []
  files = new Map<string, FileRecord>()
  // Avaliações por usuário (contagem do Admin › Usuários)
  evaluationCounts = new Map<string, number>()
  // Contas apagadas pelo PersonalDataStore, na ordem
  erased: string[] = []

  private record(request: ModeratorRequest): ModeratorRequestRecord {
    const user = this.users.get(request.userId)!
    return {
      ...request,
      user: { id: user.id, name: user.name, email: user.email },
      course: this.courses.get(request.courseId)!,
    }
  }

  readonly repositories: IdentityRepositories = {
    users: {
      findById: async (id) => this.users.get(id) ?? null,
      findByEmail: async (email) =>
        [...this.users.values()].find((user) => user.email === email) ?? null,
      insert: async (user) => {
        this.users.set(user.id, user)
      },
      updatePassword: async (userId, passwordHash, at) => {
        const user = this.users.get(userId)!
        this.users.set(userId, { ...user, passwordHash, updatedAt: at })
      },
      setAvatar: async (userId, avatarFileId, at) => {
        const user = this.users.get(userId)!
        this.users.set(userId, { ...user, avatarFileId, updatedAt: at })
      },
      rolesOf: async (userId) => this.roles.get(userId) ?? [],
      enrolledCourseIds: async (userId) =>
        this.enrolledCourses.get(userId) ?? [],
      addRole: async (userId, role) => {
        const current = this.roles.get(userId) ?? []
        if (!current.includes(role)) this.roles.set(userId, [...current, role])
      },
      insertConsents: async (consents) => {
        this.consents.push(...consents)
      },
      consentsOf: async (userId) =>
        this.consents.filter((consent) => consent.userId === userId),
      setStatus: async (userId, status, at) => {
        const user = this.users.get(userId)!
        this.users.set(userId, { ...user, status, updatedAt: at })
      },
      countAdmins: async () =>
        [...this.roles.values()].filter((roles) => roles.includes('ADMIN'))
          .length,
      search: async ({ text, status, before, limit }) =>
        [...this.users.values()]
          .filter(
            (user) =>
              text === null ||
              `${user.name} ${user.email}`
                .toLowerCase()
                .includes(text.toLowerCase()),
          )
          .filter((user) => status === null || user.status === status)
          .sort(
            (a, b) =>
              b.createdAt.getTime() - a.createdAt.getTime() ||
              b.id.localeCompare(a.id),
          )
          .filter(
            (user) =>
              before === null ||
              user.createdAt.getTime() < before.createdAt.getTime() ||
              (user.createdAt.getTime() === before.createdAt.getTime() &&
                user.id < before.id),
          )
          .slice(0, limit + 1)
          .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.status,
            roles: this.roles.get(user.id) ?? [],
            evaluationCount: this.evaluationCounts.get(user.id) ?? 0,
            createdAt: user.createdAt,
          })),
    },
    sessions: {
      findByTokenHash: async (hash) =>
        [...this.sessions.values()].find(
          (session) => session.refreshTokenHash === hash,
        ) ?? null,
      insert: async (session) => {
        this.sessions.set(session.id, session)
      },
      update: async (session) => {
        this.sessions.set(session.id, session)
      },
      revokeFamily: async (familyId, at) => {
        for (const session of this.sessions.values()) {
          if (session.familyId === familyId && session.revokedAt === null) {
            this.sessions.set(session.id, { ...session, revokedAt: at })
          }
        }
      },
      revokeAllOfUser: async (userId, at) => {
        for (const session of this.sessions.values()) {
          if (session.userId === userId && session.revokedAt === null) {
            this.sessions.set(session.id, { ...session, revokedAt: at })
          }
        }
      },
    },
    resetTokens: {
      findByTokenHash: async (hash) =>
        [...this.resetTokens.values()].find(
          (token) => token.tokenHash === hash,
        ) ?? null,
      insert: async (token) => {
        this.resetTokens.set(token.id, token)
      },
      update: async (token) => {
        this.resetTokens.set(token.id, token)
      },
      expireOpenOfUser: async (userId, at) => {
        for (const token of this.resetTokens.values()) {
          if (token.userId === userId && token.usedAt === null) {
            this.resetTokens.set(token.id, { ...token, expiresAt: at })
          }
        }
      },
    },
    moderation: {
      findRequest: async (id) => {
        const request = this.requests.get(id)
        return request ? this.record(request) : null
      },
      insertRequest: async (request) => {
        this.requests.set(request.id, request)
      },
      updateRequest: async (request) => {
        this.requests.set(request.id, request)
      },
      hasPendingRequest: async (userId, courseId) =>
        [...this.requests.values()].some(
          (request) =>
            request.userId === userId &&
            request.courseId === courseId &&
            request.status === 'PENDING',
        ),
      listRequests: async ({ status, before, limit }) =>
        [...this.requests.values()]
          .filter((request) => status === null || request.status === status)
          .sort(
            (a, b) =>
              b.createdAt.getTime() - a.createdAt.getTime() ||
              b.id.localeCompare(a.id),
          )
          .filter(
            (request) =>
              before === null ||
              request.createdAt.getTime() < before.createdAt.getTime() ||
              (request.createdAt.getTime() === before.createdAt.getTime() &&
                request.id < before.id),
          )
          .slice(0, limit + 1)
          .map((request) => this.record(request)),
      listRequestsOfUser: async (userId) =>
        [...this.requests.values()]
          .filter((request) => request.userId === userId)
          .map((request) => this.record(request)),
      insertModerator: async (moderator) => {
        this.moderators.push({ ...moderator, revokedAt: null })
      },
      isActiveModerator: async (userId, courseId) =>
        this.moderators.some(
          (moderator) =>
            moderator.userId === userId &&
            moderator.courseId === courseId &&
            moderator.revokedAt === null,
        ),
      moderatedCourses: async (userId) =>
        this.moderators
          .filter(
            (moderator) =>
              moderator.userId === userId && moderator.revokedAt === null,
          )
          .map((moderator) => this.courses.get(moderator.courseId)!),
    },
    courses: {
      findById: async (id) => this.courses.get(id) ?? null,
    },
    files: {
      findById: async (id) => this.files.get(id) ?? null,
      save: async (file) => {
        this.files.set(file.id, file)
      },
    },
    audit: {
      record: async (entry) => {
        this.auditEntries.push(entry)
      },
    },
    personalData: {
      collect: async (userId) => ({
        consents: this.consents.filter((consent) => consent.userId === userId),
        sessions: [...this.sessions.values()]
          .filter((session) => session.userId === userId)
          .map(({ createdAt, expiresAt, ip, userAgent }) => ({
            createdAt,
            expiresAt,
            ip,
            userAgent,
          })),
        preferences: [],
        moderatorRequests: [...this.requests.values()].filter(
          (request) => request.userId === userId,
        ),
        moderatedCourses: [],
        enrollments: [],
        subjectRecords: [],
        activityRecords: [],
        schedules: [],
        files: [],
        hubPosts: [],
        forumMessages: [],
        forumLikes: [],
        forumReports: [],
        evaluations: [],
        notifications: [],
      }),
      erase: async (userId) => {
        this.erased.push(userId)
        this.users.delete(userId)
        this.roles.delete(userId)
        this.consents = this.consents.filter(
          (consent) => consent.userId !== userId,
        )
        for (const [id, session] of this.sessions) {
          if (session.userId === userId) this.sessions.delete(id)
        }
      },
    },
  }

  run<T>(work: (repositories: IdentityRepositories) => Promise<T>) {
    return work(this.repositories)
  }
}

export class FakeHasher implements PasswordHasher {
  async hash(password: string) {
    return `hashed:${password}`
  }
  async verify(hash: string, password: string) {
    return hash === `hashed:${password}`
  }
}

export class FakeAccessTokens implements AccessTokens {
  async issue({ userId }: { userId: string }, now: Date) {
    return {
      token: `access:${userId}`,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    }
  }
  async verify(token: string) {
    return token.startsWith('access:') ? { userId: token.slice(7) } : null
  }
}

export class SequentialOpaqueTokens implements OpaqueTokens {
  private count = 0
  generate() {
    const token = `token-${++this.count}`
    return { token, hash: this.hash(token) }
  }
  hash(token: string) {
    return `hash(${token})`
  }
}

export class FakeClock implements Clock {
  constructor(private current = new Date('2026-11-01T12:00:00Z')) {}
  now() {
    return this.current
  }
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms)
  }
}

export class SequentialIds implements IdGenerator {
  private count = 0
  next() {
    return `00000000-0000-4000-8000-${String(++this.count).padStart(12, '0')}`
  }
}

export const TEST_SETTINGS: IdentitySettings = {
  refreshTokenTtlDays: 30,
  webUrl: 'http://localhost:3000',
  consentVersions: { terms: '1.0', privacy: '1.0' },
}

export function identityTestbed() {
  return {
    store: new InMemoryIdentity(),
    hasher: new FakeHasher(),
    accessTokens: new FakeAccessTokens(),
    opaqueTokens: new SequentialOpaqueTokens(),
    clock: new FakeClock(),
    ids: new SequentialIds(),
    settings: TEST_SETTINGS,
  }
}
