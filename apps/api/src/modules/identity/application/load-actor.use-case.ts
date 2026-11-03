import { Inject, Injectable } from '@nestjs/common'

import { ANONYMOUS, type Actor } from '../../../shared/domain/access-policy'
import { IDENTITY_UOW, type IdentityUnitOfWork } from '../domain/ports'

// Monta o ator da AccessPolicy a partir do usuário do token. "Aluno do curso"
// é quem tem a matrícula atual e ativa nele.
@Injectable()
export class LoadActorUseCase {
  constructor(@Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork) {}

  async execute(userId: string): Promise<Actor> {
    return this.uow.run(async ({ users, moderation }) => {
      const user = await users.findById(userId)
      if (!user || user.status === 'SUSPENDED') return ANONYMOUS
      const roles = await users.rolesOf(userId)
      const courses = await moderation.moderatedCourses(userId)
      return {
        userId,
        isAdmin: roles.includes('ADMIN'),
        moderatedCourseIds: new Set(courses.map((course) => course.id)),
        enrolledCourseIds: new Set(await users.enrolledCourseIds(userId)),
      }
    })
  }
}
