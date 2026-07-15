export interface User {
  id: string
  name: string
  email: string
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
