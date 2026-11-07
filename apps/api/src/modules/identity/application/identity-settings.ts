import type { ConsentVersions } from '../domain/account'

// Valores que os casos de uso recebem da configuração
export type IdentitySettings = {
  refreshTokenTtlDays: number
  // Base dos links de redefinição de senha (o web)
  webUrl: string
  // Versões vigentes dos documentos (CONSENT_VERSIONS do contracts)
  consentVersions: ConsentVersions
}

export const IDENTITY_SETTINGS = Symbol('IdentitySettings')
