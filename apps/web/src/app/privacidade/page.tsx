import { CONSENT_VERSIONS } from '@ufc-flow/contracts'
import type { Metadata } from 'next'
import Link from 'next/link'

import { SimplePage } from '@/components/simple-page'

export const metadata: Metadata = { title: 'Política de privacidade' }

// Contato para pedidos sobre dados pessoais, definido no deploy
const CONTACT = process.env.PRIVACY_CONTACT_EMAIL?.trim() || null

// Versão final (D46, D98). Mudou o texto? Suba CONSENT_VERSIONS.privacy no
// contracts: quem aceitou a versão anterior aceita de novo.
export default function PrivacyPage() {
  return (
    <SimplePage
      title="Política de privacidade"
      subtitle={`Versão ${CONSENT_VERSIONS.privacy}`}
    >
      <div className="flex flex-col gap-6 leading-relaxed [&_h2]:font-clash [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
        <section className="flex flex-col gap-2">
          <h2>Quem cuida dos seus dados</h2>
          <p>
            O UFC Flow é um projeto acadêmico de Vanderlei Furtuna, responsável
            pelo tratamento dos dados pessoais descritos aqui, nos termos da Lei
            Geral de Proteção de Dados (Lei 13.709/2018).{' '}
            {CONTACT ? (
              <>
                Pedidos e dúvidas sobre os seus dados:{' '}
                <a href={`mailto:${CONTACT}`} className="underline">
                  {CONTACT}
                </a>
                .
              </>
            ) : (
              <>
                Pedidos e dúvidas sobre os seus dados podem ser feitos a um
                administrador da plataforma.
              </>
            )}
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Sem conta</h2>
          <p>
            Sem conta, não guardamos dados pessoais seus no servidor. A grade, a
            agenda e as preferências ficam no armazenamento do seu navegador, e
            você pode apagá-las limpando os dados do site.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>O que guardamos quando você tem conta</h2>
          <ul>
            <li>
              <strong>Conta:</strong> nome, e-mail, foto de perfil (se você
              enviar) e a senha, só em forma cifrada (argon2id). Ninguém da
              equipe consegue ver a senha.
            </li>
            <li>
              <strong>Sessões:</strong> quando começaram, o endereço IP e o
              navegador, para manter você conectado e detectar uso indevido.
            </li>
            <li>
              <strong>Aceites:</strong> a versão e a data em que você aceitou os
              Termos e esta Política.
            </li>
            <li>
              <strong>Vida acadêmica:</strong> curso, estrutura curricular,
              número de matrícula e semestre de entrada; disciplinas do
              histórico com situação e nota; atividades complementares, com os
              certificados que você enviar.
            </li>
            <li>
              <strong>Agendas e preferências:</strong> as agendas sincronizadas
              com a conta, as notificações e o que você silenciou.
            </li>
            <li>
              <strong>Participação:</strong> mensagens, curtidas e denúncias no
              fórum, posts do hub (para quem modera) e avaliações de
              disciplinas.
            </li>
            <li>
              <strong>Moderação e administração:</strong> pedidos de moderação,
              com a justificativa que você escrever, e o registro de ações
              administrativas (quem mudou o quê).
            </li>
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Para que usamos</h2>
          <p>
            Só para fazer o UFC Flow funcionar: autenticar você, mostrar seus
            dados de volta, calcular o seu progresso, enviar notificações dentro
            da plataforma e proteger o serviço contra abuso. Não vendemos nem
            compartilhamos seus dados com terceiros, não usamos seus dados para
            publicidade e não enviamos e-mails.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Quem vê o quê</h2>
          <ul>
            <li>
              Seu nome e sua foto aparecem nas suas mensagens do fórum, para
              quem está logado, e nos posts do hub que você publicar.
            </li>
            <li>
              Avaliações nunca mostram quem avaliou: as médias de uma disciplina
              só aparecem a partir de 5 avaliações. A conta fica ligada à
              avaliação apenas para impedir que alguém avalie duas vezes.
            </li>
            <li>Histórico, matrícula, horas e agendas são só seus.</li>
            <li>
              Moderadores veem as denúncias do curso que moderam.
              Administradores veem nome, e-mail e situação das contas para
              gerenciá-las.
            </li>
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Cookies e estatísticas</h2>
          <p>
            Usamos dois cookies de sessão, restritos ao servidor do site, para
            manter você conectado. Eles não servem para rastrear você em outros
            sites. As visitas são contadas de forma agregada, sem cookies e sem
            identificar quem visitou.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Por quanto tempo</h2>
          <p>
            Guardamos os dados enquanto a conta existir. Sessões expiram em 30
            dias sem uso, e arquivos enviados e não usados são apagados em 24
            horas. Quando você exclui a conta, os dados pessoais são apagados na
            hora.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Seus direitos</h2>
          <p>
            Pela LGPD, você pode pedir acesso, correção, portabilidade e
            exclusão dos seus dados. Em{' '}
            <Link href="/minha-area/conta" className="underline">
              Minha conta
            </Link>
            , você baixa todos os seus dados em um arquivo e exclui a conta. Na
            exclusão, os dados pessoais (matrículas, histórico, horas, agendas,
            preferências, sessões, curtidas e arquivos pessoais) são apagados de
            fato; o que pertence à comunidade fica sem o seu nome: mensagens do
            fórum viram &ldquo;mensagem removida&rdquo;, avaliações continuam
            nas médias e posts do hub ficam sem autor. Para corrigir nome ou
            e-mail, fale com um administrador.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Segurança</h2>
          <p>
            A conexão com o site é cifrada, as senhas são guardadas só em forma
            cifrada e os tokens de acesso ficam em cookies que o JavaScript da
            página não consegue ler.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Mudanças nesta política</h2>
          <p>
            Quando esta política mudar, a versão sobe e pedimos que você leia e
            aceite de novo antes de continuar usando a conta.
          </p>
        </section>
      </div>
    </SimplePage>
  )
}
