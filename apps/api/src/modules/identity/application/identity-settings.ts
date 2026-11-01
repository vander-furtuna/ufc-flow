// Valores que os casos de uso recebem da configuração
export type IdentitySettings = {
  refreshTokenTtlDays: number
  // Base dos links de redefinição de senha (o web)
  webUrl: string
  // Versões dos documentos aceitos no cadastro. Os textos atuais são
  // preliminares; o definitivo chega na fase 13 (LGPD), com novo aceite.
  termsVersion: string
  privacyVersion: string
}

export const IDENTITY_SETTINGS = Symbol('IdentitySettings')

export const CONSENT_VERSIONS = { terms: '0.1', privacy: '0.1' } as const
