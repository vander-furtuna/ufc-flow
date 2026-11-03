'use client'

import { Panel } from './academic-shell'
import { EnrollmentForm } from './enrollment-form'

// Primeiro acesso à Minha área, sem matrícula
export function FirstEnrollment() {
  return (
    <Panel title="Cadastre sua matrícula" className="mx-auto w-full max-w-xl">
      <p className="text-sm text-muted-foreground">
        Com o curso e a estrutura curricular, o Flow calcula sua integralização
        e as disciplinas liberadas. Os dados são declarados por você; a
        validação oficial continua sendo da coordenação.
      </p>
      <EnrollmentForm />
    </Panel>
  )
}
