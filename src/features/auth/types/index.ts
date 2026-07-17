export type Role = 'ALUNO' | 'MODERADOR' | 'ADMIN'

export interface UserCourseRole {
  id: string
  registrationNumber: string | null
  roles: Role[]
  isCurrent: boolean
  declarationUrl: string | null
  isVerified: boolean
  userId: string
  courseId: string
}

export interface User {
  id: string
  name: string
  email: string
  courseRoles?: UserCourseRole[]
}

export interface SignInResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}
