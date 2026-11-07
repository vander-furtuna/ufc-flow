import type { ConsentDocument, UserRole } from '@ufc-flow/contracts'

import { IdentityErrors } from './errors'

export type ConsentVersions = { terms: string; privacy: string }

const DOCUMENTS: [ConsentDocument, keyof ConsentVersions][] = [
  ['TERMS', 'terms'],
  ['PRIVACY', 'privacy'],
]

// Documentos sem aceite na versão vigente (D46). Vale a igualdade, não a
// ordem: qualquer versão diferente da atual pede novo aceite.
export function pendingConsents(
  accepted: { document: ConsentDocument; version: string }[],
  current: ConsentVersions,
): ConsentDocument[] {
  return DOCUMENTS.filter(
    ([document, key]) =>
      !accepted.some(
        (consent) =>
          consent.document === document && consent.version === current[key],
      ),
  ).map(([document]) => document)
}

// O web manda as versões que mostrou; texto antigo não vale como aceite
export function assertCurrentVersions(
  shown: { termsVersion: string; privacyVersion: string },
  current: ConsentVersions,
) {
  if (
    shown.termsVersion !== current.terms ||
    shown.privacyVersion !== current.privacy
  ) {
    throw IdentityErrors.consentOutdated()
  }
}

// A plataforma não pode ficar sem admin: o último precisa nomear outro antes
export function assertCanDeleteAccount(roles: UserRole[], adminCount: number) {
  if (roles.includes('ADMIN') && adminCount <= 1) {
    throw IdentityErrors.lastAdmin()
  }
}

// Suspensão é para contas comuns: admin não suspende a si nem outro admin
export function assertCanSuspend(
  actorId: string,
  targetId: string,
  targetRoles: UserRole[],
) {
  if (actorId === targetId) throw IdentityErrors.cannotSuspendSelf()
  if (targetRoles.includes('ADMIN')) throw IdentityErrors.cannotSuspendAdmin()
}
