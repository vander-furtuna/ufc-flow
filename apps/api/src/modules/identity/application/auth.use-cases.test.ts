import { describe, expect, it } from 'vitest'

import { ANONYMOUS, type Actor } from '../../../shared/domain/access-policy'
import { DomainError } from '../../../shared/domain/domain-error'
import { CreatePasswordResetLinkUseCase } from './create-password-reset-link.use-case'
import { GetMeUseCase } from './get-me.use-case'
import { LoadActorUseCase } from './load-actor.use-case'
import { RefreshSessionUseCase } from './refresh-session.use-case'
import { ResetPasswordUseCase } from './reset-password.use-case'
import { SessionIssuer } from './session-issuer'
import { SignInUseCase } from './sign-in.use-case'
import { SignOutUseCase } from './sign-out.use-case'
import { SignUpUseCase } from './sign-up.use-case'
import { identityTestbed } from './testing/in-memory-identity'

const context = { userAgent: 'Chrome', ip: '10.0.0.1' }
const DAY = 24 * 60 * 60 * 1000

function setup() {
  const t = identityTestbed()
  const issuer = new SessionIssuer(
    t.accessTokens,
    t.opaqueTokens,
    t.clock,
    t.ids,
    t.settings,
  )
  return {
    ...t,
    signUp: new SignUpUseCase(
      t.store,
      t.hasher,
      issuer,
      t.clock,
      t.ids,
      t.settings,
    ),
    signIn: new SignInUseCase(t.store, t.hasher, issuer, t.settings),
    refresh: new RefreshSessionUseCase(
      t.store,
      t.accessTokens,
      t.opaqueTokens,
      t.clock,
      t.ids,
      t.settings,
    ),
    signOut: new SignOutUseCase(t.store, t.opaqueTokens, t.clock),
    getMe: new GetMeUseCase(t.store, t.settings),
    loadActor: new LoadActorUseCase(t.store),
    createLink: new CreatePasswordResetLinkUseCase(
      t.store,
      t.opaqueTokens,
      t.clock,
      t.ids,
      t.settings,
    ),
    resetPassword: new ResetPasswordUseCase(
      t.store,
      t.hasher,
      t.opaqueTokens,
      t.clock,
    ),
  }
}

const signUpInput = {
  name: 'Ana Souza',
  email: ' Ana@ALU.ufc.br ',
  password: 'uma senha longa',
  acceptTerms: true as const,
  acceptPrivacy: true as const,
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  return 'sem erro'
}

describe('cadastro', () => {
  it('cria o usuário, grava os aceites e já abre a sessão', async () => {
    const s = setup()
    const session = await s.signUp.execute(signUpInput, context)
    expect(session.user).toMatchObject({
      name: 'Ana Souza',
      email: 'ana@alu.ufc.br',
      status: 'ACTIVE',
      roles: [],
      moderatedCourses: [],
    })
    expect(session.tokens).toMatchObject({
      tokenType: 'Bearer',
      accessToken: `access:${session.user.id}`,
      refreshToken: 'token-1',
    })
    expect(s.store.users.get(session.user.id)?.passwordHash).toBe(
      'hashed:uma senha longa',
    )
    expect(
      s.store.consents.map(({ document, version }) => [document, version]),
    ).toEqual([
      ['TERMS', '1.0'],
      ['PRIVACY', '1.0'],
    ])
    expect([...s.store.sessions.values()][0]).toMatchObject({
      userAgent: 'Chrome',
      ip: '10.0.0.1',
      refreshTokenHash: 'hash(token-1)',
    })
  })

  it('recusa e-mail já cadastrado, sem diferenciar maiúsculas', async () => {
    const s = setup()
    await s.signUp.execute(signUpInput, context)
    expect(
      await codeOf(
        s.signUp.execute({ ...signUpInput, email: 'ana@alu.ufc.br' }, context),
      ),
    ).toBe('USER_EMAIL_TAKEN')
  })

  it('recusa senha curta mesmo sem passar pelo schema', async () => {
    const s = setup()
    expect(
      await codeOf(
        s.signUp.execute({ ...signUpInput, password: 'curta' }, context),
      ),
    ).toBe('PASSWORD_TOO_SHORT')
  })
})

describe('login', () => {
  it('entra com e-mail em qualquer caixa e abre uma família nova', async () => {
    const s = setup()
    const created = await s.signUp.execute(signUpInput, context)
    const session = await s.signIn.execute(
      { email: 'ANA@alu.ufc.br', password: 'uma senha longa' },
      context,
    )
    expect(session.user.id).toBe(created.user.id)
    const families = new Set(
      [...s.store.sessions.values()].map((x) => x.familyId),
    )
    expect(families.size).toBe(2)
  })

  it('não diz se o erro é no e-mail ou na senha', async () => {
    const s = setup()
    await s.signUp.execute(signUpInput, context)
    expect(
      await codeOf(
        s.signIn.execute(
          { email: 'ana@alu.ufc.br', password: 'errada!!' },
          context,
        ),
      ),
    ).toBe('INVALID_CREDENTIALS')
    expect(
      await codeOf(
        s.signIn.execute({ email: 'outra@alu.ufc.br', password: 'x' }, context),
      ),
    ).toBe('INVALID_CREDENTIALS')
  })

  it('bloqueia conta suspensa', async () => {
    const s = setup()
    const { user } = await s.signUp.execute(signUpInput, context)
    s.store.users.set(user.id, {
      ...s.store.users.get(user.id)!,
      status: 'SUSPENDED',
    })
    expect(
      await codeOf(
        s.signIn.execute(
          { email: 'ana@alu.ufc.br', password: 'uma senha longa' },
          context,
        ),
      ),
    ).toBe('USER_SUSPENDED')
  })
})

describe('renovação e saída', () => {
  it('gira o token de renovação', async () => {
    const s = setup()
    const { tokens } = await s.signUp.execute(signUpInput, context)
    const renewed = await s.refresh.execute(
      { refreshToken: tokens.refreshToken },
      context,
    )
    expect(renewed.refreshToken).not.toBe(tokens.refreshToken)
    expect(
      await codeOf(
        s.refresh.execute({ refreshToken: renewed.refreshToken }, context),
      ),
    ).toBe('sem erro')
  })

  it('reusar um token girado derruba a família inteira', async () => {
    const s = setup()
    const { tokens } = await s.signUp.execute(signUpInput, context)
    const renewed = await s.refresh.execute(
      { refreshToken: tokens.refreshToken },
      context,
    )
    expect(
      await codeOf(
        s.refresh.execute({ refreshToken: tokens.refreshToken }, context),
      ),
    ).toBe('REFRESH_TOKEN_REUSED')
    expect(
      await codeOf(
        s.refresh.execute({ refreshToken: renewed.refreshToken }, context),
      ),
    ).toBe('REFRESH_TOKEN_REUSED')
  })

  it('recusa token desconhecido ou expirado', async () => {
    const s = setup()
    expect(
      await codeOf(s.refresh.execute({ refreshToken: 'nada' }, context)),
    ).toBe('REFRESH_TOKEN_INVALID')
    const { tokens } = await s.signUp.execute(signUpInput, context)
    s.clock.advance(31 * DAY)
    expect(
      await codeOf(
        s.refresh.execute({ refreshToken: tokens.refreshToken }, context),
      ),
    ).toBe('REFRESH_TOKEN_EXPIRED')
  })

  it('conta suspensa não renova', async () => {
    const s = setup()
    const { user, tokens } = await s.signUp.execute(signUpInput, context)
    s.store.users.set(user.id, {
      ...s.store.users.get(user.id)!,
      status: 'SUSPENDED',
    })
    expect(
      await codeOf(
        s.refresh.execute({ refreshToken: tokens.refreshToken }, context),
      ),
    ).toBe('USER_SUSPENDED')
  })

  it('sair encerra a família, e repetir não dá erro', async () => {
    const s = setup()
    const { tokens } = await s.signUp.execute(signUpInput, context)
    await s.signOut.execute({ refreshToken: tokens.refreshToken })
    await s.signOut.execute({ refreshToken: tokens.refreshToken })
    await s.signOut.execute({ refreshToken: 'desconhecido' })
    expect(
      await codeOf(
        s.refresh.execute({ refreshToken: tokens.refreshToken }, context),
      ),
    ).toBe('REFRESH_TOKEN_REUSED')
  })
})

describe('/me e ator', () => {
  it('traz papéis e cursos moderados', async () => {
    const s = setup()
    const { user } = await s.signUp.execute(signUpInput, context)
    s.store.roles.set(user.id, ['ADMIN'])
    s.store.courses.set('c1', { id: 'c1', slug: 'eng', name: 'Engenharia' })
    s.store.moderators.push({
      id: 'm1',
      userId: user.id,
      courseId: 'c1',
      requestId: 'r1',
      grantedBy: null,
      grantedAt: s.clock.now(),
      revokedAt: null,
    })
    expect(await s.getMe.execute(user.id)).toMatchObject({
      roles: ['ADMIN'],
      moderatedCourses: [{ id: 'c1', slug: 'eng', name: 'Engenharia' }],
    })
    expect(await s.loadActor.execute(user.id)).toEqual({
      userId: user.id,
      isAdmin: true,
      moderatedCourseIds: new Set(['c1']),
      enrolledCourseIds: new Set(),
    })
  })

  it('usuário apagado ou inexistente vira anônimo e /me dá 404', async () => {
    const s = setup()
    expect(await s.loadActor.execute('ninguem')).toEqual(ANONYMOUS)
    expect(await codeOf(s.getMe.execute('ninguem'))).toBe('USER_NOT_FOUND')
  })
})

describe('redefinição de senha pelo admin', () => {
  async function withAdmin() {
    const s = setup()
    const { user } = await s.signUp.execute(signUpInput, context)
    const admin = await s.signUp.execute(
      { ...signUpInput, email: 'admin@ufc.br', name: 'Admin' },
      context,
    )
    const adminActor: Actor = {
      userId: admin.user.id,
      isAdmin: true,
      moderatedCourseIds: new Set(),
      enrolledCourseIds: new Set(),
    }
    return { s, user, adminActor }
  }

  it('o admin gera o link; ele troca a senha e encerra as sessões', async () => {
    const { s, user, adminActor } = await withAdmin()
    const link = await s.createLink.execute(adminActor, user.id)
    expect(link.url).toMatch(
      /^http:\/\/localhost:3000\/redefinir-senha\?token=token-\d+$/,
    )
    expect(link.expiresAt).toBe('2026-11-02T12:00:00.000Z')
    expect(s.store.auditEntries).toContainEqual(
      expect.objectContaining({
        action: 'password_reset_link.created',
        entityId: user.id,
      }),
    )

    const token = new URL(link.url).searchParams.get('token')!
    await s.resetPassword.execute({ token, password: 'nova senha longa' })
    expect(s.store.users.get(user.id)?.passwordHash).toBe(
      'hashed:nova senha longa',
    )
    expect(
      [...s.store.sessions.values()]
        .filter((session) => session.userId === user.id)
        .every((session) => session.revokedAt !== null),
    ).toBe(true)
    expect(
      await codeOf(s.resetPassword.execute({ token, password: 'outra senha' })),
    ).toBe('PASSWORD_RESET_TOKEN_USED')
  })

  it('um link novo invalida o anterior', async () => {
    const { s, user, adminActor } = await withAdmin()
    const first = await s.createLink.execute(adminActor, user.id)
    await s.createLink.execute(adminActor, user.id)
    const token = new URL(first.url).searchParams.get('token')!
    expect(
      await codeOf(s.resetPassword.execute({ token, password: 'nova senha' })),
    ).toBe('PASSWORD_RESET_TOKEN_EXPIRED')
  })

  it('só admin gera link, para usuário que existe', async () => {
    const { s, user, adminActor } = await withAdmin()
    expect(await codeOf(s.createLink.execute(ANONYMOUS, user.id))).toBe(
      'ACCESS_DENIED',
    )
    expect(await codeOf(s.createLink.execute(adminActor, 'ninguem'))).toBe(
      'USER_NOT_FOUND',
    )
  })

  it('token desconhecido é inválido', async () => {
    const s = setup()
    expect(
      await codeOf(
        s.resetPassword.execute({ token: 'x', password: 'nova senha' }),
      ),
    ).toBe('PASSWORD_RESET_TOKEN_INVALID')
  })
})
