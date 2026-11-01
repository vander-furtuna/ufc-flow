import type { Metadata } from 'next'
import Link from 'next/link'

import { InfoNote } from '@/components/auth/form-parts'
import { SimplePage } from '@/components/simple-page'

export const metadata: Metadata = { title: 'Termos de uso' }

// Texto preliminar (versão 0.1, igual a CONSENT_VERSIONS.terms da API). A
// versão final sai na fase 13 e exige novo aceite.
export default function TermsPage() {
  return (
    <SimplePage title="Termos de uso" subtitle="Versão 0.1 (preliminar)">
      <InfoNote>
        Este texto é provisório. Quando a versão final for publicada, vamos
        pedir que você leia e aceite de novo.
      </InfoNote>
      <div className="flex flex-col gap-6 leading-relaxed [&_h2]:font-clash [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
        <section className="flex flex-col gap-2">
          <h2>O que é o UFC Flow</h2>
          <p>
            O UFC Flow é um projeto acadêmico, feito por estudantes, para ajudar
            quem estuda na Universidade Federal do Ceará a acompanhar a grade
            curricular, as turmas e a agenda do semestre. Não é um serviço
            oficial da UFC e não substitui o SIGAA: em caso de divergência,
            valem os dados e as regras do SIGAA e da coordenação do seu curso.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Uso sem conta</h2>
          <p>
            Grades, turmas e a montagem de agendas funcionam sem conta. Nesse
            caso, o que você monta fica só no seu navegador.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Sua conta</h2>
          <ul>
            <li>Use um nome e um e-mail verdadeiros.</li>
            <li>
              Guarde sua senha. Ainda não enviamos e-mails; para redefinir a
              senha, peça a um administrador um link de uso único.
            </li>
            <li>
              Você responde pelo que fizer com a sua conta. Não compartilhe o
              acesso.
            </li>
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Conduta</h2>
          <p>
            Nas áreas de participação (hub, fórum e avaliações, quando
            existirem), não publique conteúdo ilegal, ofensivo, discriminatório
            ou que exponha dados de outras pessoas. Moderadores do curso e
            administradores podem remover conteúdo e suspender contas que
            descumpram estas regras.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Disponibilidade</h2>
          <p>
            O serviço é oferecido como está, sem garantia de disponibilidade
            contínua ou de que os dados acadêmicos estejam sempre atualizados.
            Funcionalidades podem mudar ou sair do ar.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Seus dados</h2>
          <p>
            O tratamento dos seus dados pessoais está descrito na{' '}
            <Link href="/privacidade" className="underline">
              Política de privacidade
            </Link>
            .
          </p>
        </section>
      </div>
    </SimplePage>
  )
}
