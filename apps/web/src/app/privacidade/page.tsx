import type { Metadata } from 'next'

import { InfoNote } from '@/components/auth/form-parts'
import { SimplePage } from '@/components/simple-page'

export const metadata: Metadata = { title: 'Política de privacidade' }

// Texto preliminar (versão 0.1, igual a CONSENT_VERSIONS.privacy da API). A
// versão final sai na fase 13, com exportação e exclusão de conta, e exige
// novo aceite.
export default function PrivacyPage() {
  return (
    <SimplePage
      title="Política de privacidade"
      subtitle="Versão 0.1 (preliminar)"
    >
      <InfoNote>
        Este texto é provisório. Quando a versão final for publicada, vamos
        pedir que você leia e aceite de novo.
      </InfoNote>
      <div className="flex flex-col gap-6 leading-relaxed [&_h2]:font-clash [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
        <section className="flex flex-col gap-2">
          <h2>Sem conta</h2>
          <p>
            Sem conta, não guardamos dados pessoais seus no servidor. A grade, a
            agenda e as preferências ficam no armazenamento do seu navegador, e
            você pode apagá-las limpando os dados do site.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>O que guardamos quando você cria uma conta</h2>
          <ul>
            <li>Nome e e-mail, para identificar a conta.</li>
            <li>
              A senha, só em forma cifrada (argon2id). Ninguém da equipe
              consegue ver a senha.
            </li>
            <li>
              As sessões abertas: quando começaram, o endereço IP e o navegador
              usado, para manter você conectado e detectar uso indevido.
            </li>
            <li>A versão e a data em que você aceitou estes documentos.</li>
            <li>
              Pedidos de moderação de curso, com a justificativa que você
              escrever.
            </li>
          </ul>
          <p>
            Quando novas áreas forem lançadas (histórico acadêmico, agendas
            sincronizadas, hub, fórum e avaliações), o que você cadastrar nelas
            também fica guardado na sua conta.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Para que usamos</h2>
          <p>
            Só para fazer o UFC Flow funcionar: autenticar você, mostrar seus
            dados de volta e proteger o serviço contra abuso. Não vendemos nem
            compartilhamos seus dados com terceiros e não enviamos e-mails.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Cookies</h2>
          <p>
            Usamos dois cookies de sessão, restritos ao servidor do site, para
            manter você conectado. Eles não servem para rastrear você em outros
            sites.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Seus direitos</h2>
          <p>
            Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir acesso,
            correção, exportação e exclusão dos seus dados. Na exclusão, os
            dados pessoais são apagados de fato; o que pertence à comunidade
            (mensagens do fórum, avaliações e posts) é anonimizado e continua
            visível sem o seu nome. A exportação e a exclusão pela própria conta
            chegam na versão final desta política; até lá, peça a um
            administrador.
          </p>
        </section>
      </div>
    </SimplePage>
  )
}
