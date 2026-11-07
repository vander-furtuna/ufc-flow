import { CONSENT_VERSIONS } from '@ufc-flow/contracts'
import type { Metadata } from 'next'
import Link from 'next/link'

import { SimplePage } from '@/components/simple-page'

export const metadata: Metadata = { title: 'Termos de uso' }

// Versão final (D46, D98). Mudou o texto? Suba CONSENT_VERSIONS.terms no
// contracts: quem aceitou a versão anterior aceita de novo.
export default function TermsPage() {
  return (
    <SimplePage
      title="Termos de uso"
      subtitle={`Versão ${CONSENT_VERSIONS.terms}`}
    >
      <div className="flex flex-col gap-6 leading-relaxed [&_h2]:font-clash [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
        <section className="flex flex-col gap-2">
          <h2>O que é o UFC Flow</h2>
          <p>
            O UFC Flow é um projeto acadêmico, feito por estudantes, para ajudar
            quem estuda na Universidade Federal do Ceará a acompanhar a grade
            curricular, as turmas, a agenda do semestre e a vida no curso. Não é
            um serviço oficial da UFC e não substitui o SIGAA: em caso de
            divergência, valem os dados e as regras do SIGAA e da coordenação do
            seu curso.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Uso sem conta</h2>
          <p>
            Grades, turmas, o hub do curso, a página de links e a montagem de
            agendas funcionam sem conta. Nesse caso, o que você monta fica só no
            seu navegador.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Sua conta</h2>
          <ul>
            <li>
              Use um nome e um e-mail verdadeiros, e uma conta por pessoa.
            </li>
            <li>
              Guarde sua senha. Não enviamos e-mails; para redefinir a senha,
              peça a um administrador um link de uso único.
            </li>
            <li>
              Você responde pelo que fizer com a sua conta. Não compartilhe o
              acesso.
            </li>
            <li>
              Você pode baixar seus dados e excluir a conta quando quiser, em{' '}
              <Link href="/minha-area/conta" className="underline">
                Minha conta
              </Link>
              .
            </li>
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Informações acadêmicas</h2>
          <p>
            Matrícula, histórico e horas complementares são declarados por você
            e não são conferidos pela UFC. O progresso de integralização é uma
            estimativa: a validação oficial continua sendo da coordenação do
            curso. Declarar informações falsas, inclusive para avaliar
            disciplinas que você não cursou, descumpre estes termos.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Participação</h2>
          <p>
            No fórum, nas avaliações de disciplinas e nos posts do hub, não
            publique conteúdo ilegal, ofensivo, discriminatório, enganoso,
            propaganda sem relação com o curso ou que exponha dados de outras
            pessoas. Avaliações são anônimas para quem lê, mas devem refletir a
            sua experiência com a disciplina, e não ataques a pessoas.
          </p>
          <ul>
            <li>
              Moderadores do curso e administradores podem ocultar e remover
              mensagens, silenciar ou banir alguém do fórum de um curso e
              remover posts.
            </li>
            <li>
              Administradores podem suspender contas e descartar as avaliações
              de contas suspeitas.
            </li>
            <li>
              Qualquer pessoa logada pode denunciar uma mensagem; a denúncia vai
              para a moderação do curso.
            </li>
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h2>O que você publica</h2>
          <p>
            Você continua responsável pelo que escreve e nos autoriza a exibir
            esse conteúdo na plataforma. Se excluir a conta, o que pertence à
            comunidade fica sem o seu nome: mensagens do fórum viram
            &ldquo;mensagem removida&rdquo; para manter as conversas, avaliações
            continuam nas médias e posts do hub ficam sem autor.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Extensão do navegador</h2>
          <p>
            A extensão do UFC Flow lê as páginas do SIGAA que você abre, para
            montar a estrutura curricular e enviá-la ao UFC Flow quando você
            pedir. Ela não guarda sua senha do SIGAA e não envia nada sem a sua
            ação.
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
          <h2>Mudanças nestes termos</h2>
          <p>
            Quando estes termos mudarem, a versão sobe e pedimos que você leia e
            aceite de novo antes de continuar usando a conta.
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
