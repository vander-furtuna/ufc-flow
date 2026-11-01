# Roadmap da v2

A v2 é construída de dentro para fora. Primeiro vêm as regras puras e os contratos, depois a extensão que alimenta o catálogo, depois a API e, por fim, cada funcionalidade de ponta a ponta (API + web). Cada fase termina com tudo verde (typecheck, lint, testes, build) e mesclada em `develop`.

```mermaid
flowchart LR
  F0[0 Fundação] --> F1[1 academic-core]
  F0 --> F2[2 contracts]
  F1 --> F3[3 Extensão]
  F2 --> F3
  F1 --> F4[4 API + identidade]
  F2 --> F4
  F4 --> F5[5 Catálogo, ingestão e admin de ECs]
  F3 --> F5
  F5 --> F6[6 Turmas e agendas]
  F6 --> F7[7 Notificações]
  F5 --> F8[8 Arquivos]
  F8 --> F9[9 Vida acadêmica]
  F8 --> F10[10 Hub e página de links]
  F7 --> F11[11 Fórum e moderação]
  F9 --> F12[12 Avaliação de disciplinas]
  F11 --> F13[13 LGPD, deploy e lançamento]
  F10 --> F13
  F12 --> F13
```

## Como trabalhar uma fase

1. Leia a fase aqui, as seções da modelagem que ela cita e as telas listadas.
2. Crie `feature/<fase>-<assunto>` a partir de `develop` (fases grandes podem ter várias branches).
3. Para regras de domínio, escreva os testes antes. Cada linha de tabela de regras da modelagem vira pelo menos um teste.
4. Implemente, rode `pnpm typecheck`, `pnpm lint` e os testes, e marque as caixas desta página no mesmo PR.
5. Atualize [estado-atual.md](estado-atual.md) ao fechar a fase.

---

## Fase 0 — Fundação

**Objetivo:** monorepo instalável e verde, com ferramentas finais (pnpm, Turborepo, oxlint) e banco de desenvolvimento.

- [x] `pnpm install` gera o `pnpm-lock.yaml`; `pnpm typecheck`, `pnpm lint` e `pnpm build` passam.
- [x] Corrigir `react-hooks/set-state-in-effect` em `apps/web/src/contexts/schedule.tsx`, por exemplo derivando o carregamento num `useEffect` assíncrono com flag de cancelamento, ou trocando por TanStack Query. Corrigido também em `class.tsx` e, com a mudança mínima, em `calendar.tsx`.
- [x] Migrar ESLint → oxlint (D19):
  - Rodar `pnpm dlx @oxlint/migrate apps/web/eslint.config.mjs`.
  - Criar a `.oxlintrc.json` na raiz com os plugins `typescript`, `react`, `nextjs`, `import` e `jsx-a11y`.
  - Ligar `eslint-plugin-react-hooks` como plugin JS e o type-aware com `oxlint-tsgolint`.
  - Remover o ESLint e seus plugins.
  - Usar o Prettier só como formatador, com `prettier --check` no CI.
  - Script `lint` por pacote.
  - Confirmar a compatibilidade do tsgolint (TypeScript 7) com os tsconfig em TS 5.9.
- [x] `docker/compose.dev.yml` com PostgreSQL 17 (porta 5432, volume nomeado) e `.env.example` na raiz da API.
- [x] `main` × `master` (D20): `master` continua como produção.
  - [x] CI em PRs para `develop` e `master`.
  - [x] Apagar `main` no remoto (`git push origin --delete main`) e conferir que o GitHub e o Coolify usam `master`.
- [x] Unificar os bancos IndexedDB do web (`UFCFlowDB` + `ufc-flow-indexeddb`) num só, com migração dos dados existentes.
- [x] Vitest configurado no monorepo (`vitest.workspace` ou config por pacote) e tarefa `test` no `turbo.json`.

**Pronto quando:** CI verde em PR para `develop`; `docker compose -f docker/compose.dev.yml up` sobe o Postgres; nenhum dado local de usuário é perdido na unificação do IndexedDB.

## Fase 1 — `packages/academic-core`

**Objetivo:** todas as regras acadêmicas puras, 100% testadas, usadas depois por web, API e extensão. Modelagem: Catálogo acadêmico (Requisitos como expressão), Turmas e agendas (Agenda), Vida acadêmica (Regras do histórico, Progresso), Fórum (Menções).

- [x] `RequirementExpr` (`subject` | `and` | `or`):
  - Parse do texto do SIGAA (`( ECO0018 E ( SBL0084 OU CEC0022 ) )`) para árvore, respeitando parênteses e precedência.
  - Serialização de volta para texto.
  - Extração dos códigos citados.
  - Avaliação contra um conjunto de disciplinas cumpridas, considerando equivalências.
  - Detecção de ciclos num conjunto de disciplinas.
- [x] Termo letivo: parse e comparação de `"2026.1"`, próximo e anterior.
- [x] Conflito de horário entre slots (`weekday`, `start_time`, `end_time`). Portar e substituir `apps/web/src/utils/check-time-conflict`.
- [x] Regras do agregado de agenda: no máximo uma turma por disciplina e nenhum conflito.
- [x] Regras do histórico (tabela "Regras do histórico"):
  - Uma tentativa em aberto por disciplina.
  - Fechamento de `CURSANDO`.
  - Nova tentativa só depois de `REPROVADO`, `TRANCADA` ou `SUPRIMIDA`, em semestre posterior.
  - `APROVEITADA` lançada direto.
  - Faixa de nota por situação (D25: 0 a 10 com duas casas, sem mínimo ou máximo por situação).
- [x] Cálculo de progresso de integralização: obrigatórias, optativas mais livres com teto, cada vertente (horas e componentes), complementares por categoria com teto, extensão e total.
- [x] Disciplinas liberadas para cursar, a partir do histórico e da EC.
- [x] Extração de menções `@([A-Z]{2,5}\d{3,5})`.
- [x] Normalização de busca (sem acento, minúsculas), compartilhada com o web.

**Pronto quando:** o pacote tem cobertura de pelo menos 90%, não depende de framework nem de I/O, e o web já usa o conflito de horário daqui.

## Fase 2 — `packages/contracts`

**Objetivo:** os schemas Zod que web, API e extensão compartilham. Modelagem: Importação e edição de grades, Hub do curso, Página de links, Monorepo e arquitetura (Swagger).

- [x] Enums: naturezas, tipos de vertente, `record_status`, papéis, status de EC, tipos de post e de link, temas da página de links.
- [x] `CurriculumImportV1`: curso (`sigaaId`, nome), EC (período, cidade, cargas), disciplinas com `RequirementExpr`, vertentes com chaves locais e regras da EC. Versionado por `schemaVersion: 1`.
- [x] Problem Details (`type`, `title`, `status`, `detail`, `code`) e paginação por cursor.
- [x] União discriminada dos posts do hub por `type` (tabela de `attributes`).
- [x] Tokens dos temas da página de links (CIANO, LARANJA, VERDE, VIOLETA, BRANCO, ESCURO), com contraste AA verificado em teste. Três destaques mudaram para passar (D31).
- [x] Converter para JSON Schema com `z.toJSONSchema` (para o Swagger) e testar um exemplo válido e um inválido de cada schema.

**Pronto quando:** um JSON de exemplo de EC real passa no `CurriculumImportV1` e fica versionado como fixture em `packages/contracts/fixtures/`. A EC é a Eng. de Computação 2006.2, porque a 2025.1 não existe (D33).

## Fase 3 — Extensão (`apps/extension`)

**Objetivo:** substituir a extensão atual por uma que lê requisitos como expressão, gera `CurriculumImportV1` e envia ao Flow. Modelagem: Importação e edição de grades (Fluxo). Telas: `Ext-*` (9).

- [ ] Migrar a **cópia de trabalho** de `C:\Users\furtu\www\sigaa-classes-scraping` (inclui arquivos não commitados) para `apps/extension`, em Plasmo, dentro do workspace pnpm.
- [ ] Trocar o parser de requisitos pelo do `academic-core`. Corrige o bug que transforma `OU` em `E`. Cobrir com testes usando HTML real salvo do SIGAA (`example.html` do repositório antigo) como fixture.
- [ ] Gerar `CurriculumImportV1` validado com `packages/contracts` antes de oferecer envio ou download.
- [ ] UI nova conforme as telas:
  - Popup fora do SIGAA, com login para moderadores e estado de estrutura detectada (claro e escuro).
  - Botão flutuante na página do SIGAA.
  - Painel com grade, vertentes, regras e revisão.
  - Modais de envio concluído e de envio pendente (curso inexistente).
- [ ] Login com e-mail e senha da API (Bearer em `chrome.storage`) e envio para `POST /ingestion/curriculum-imports`. Até a fase 5, o envio fica atrás de uma flag e só o download do JSON funciona.

**Pronto quando:** a extensão extrai Eng. de Computação 2025.1 do SIGAA e o JSON passa no schema, com as expressões `OU` preservadas.

## Fase 4 — API e identidade (`apps/api`)

**Objetivo:** esqueleto NestJS completo e o módulo `identity`. Modelagem: Monorepo e arquitetura, Usuários papéis e permissões.

- [ ] NestJS com a estrutura hexagonal por módulo, `shared/` (Result, DomainError, Clock, IdGenerator, paginação, guards) e `database/` (cliente Drizzle, migrations com `drizzle-kit`).
- [ ] Swagger em `/docs`:
  - Um documento por versão (`/v1`).
  - Bearer auth.
  - Problem Details referenciado em todas as rotas.
  - Teste de CI que falha se uma operação não tiver resumo e respostas.
  - `openapi.json` versionado.
  - Basic Auth ou `SWAGGER_ENABLED=false` em produção.
- [ ] Tabelas de identidade: `users`, `user_roles`, `course_moderators`, `moderator_requests`, `sessions`, `password_reset_tokens`, `user_preferences`, `user_consents` e `audit_logs`.
- [ ] Cadastro com aceite de termos, login, refresh com rotação e revogação por família, logout, `GET /me`. Senhas com argon2id e limite de tentativas com `@nestjs/throttler`.
- [ ] Recuperação de senha manual: o admin gera um link de uso único válido por 24 h.
- [ ] Solicitação de moderação, com aprovação e rejeição pelo admin.
- [ ] `AccessPolicy` com todas as linhas da Matriz de permissões, testadas sem banco.
- [ ] Seed do primeiro admin por comando (`pnpm --filter @ufc-flow/api seed:admin`).
- [ ] Web como BFF: tokens em cookies httpOnly, chamadas à API feitas no servidor, telas `Main` e `Mobile-Entrar`, menu do usuário no header.
- [ ] Testes: unitários no domínio, casos de uso com repositórios em memória, integração Drizzle com Testcontainers e e2e com supertest.

**Pronto quando:** dá para criar conta, entrar, renovar a sessão e sair pelo web e pelo Swagger, e um admin aprova um pedido de moderação.

## Fase 5 — Catálogo, ingestão e admin de ECs

**Objetivo:** o catálogo sai do `courses.ts` e vai para o banco, com a área administrativa no lugar do course-maker. Modelagem: Catálogo acadêmico, Importação e edição de grades. Telas: `Admin-EC`, `Mobile-Admin-EC`, `Mobile-Admin-EC-Editar`, `Ext-Envio-*`.

- [ ] Tabelas do catálogo: `campuses`, `courses`, `curricula`, `subjects`, `curriculum_subjects`, os derivados `*_requirements`, `branches`, `curriculum_subject_branches`, `subject_equivalences` e `subject_equivalence_codes`.
- [ ] Agregado `Curriculum` com o ciclo DRAFT → PUBLISHED e **todas** as linhas da tabela "Ciclo de vida e edição" como testes. Auditoria em `audit_logs`.
- [ ] `is_current` manual, uma por curso, trocada numa transação.
- [ ] `POST /ingestion/curriculum-imports`:
  - Validação pelo schema e JSON bruto guardado.
  - Curso localizado por `sigaa_id`; se não existir, a importação fica pendente.
  - Disciplinas reaproveitadas, e divergências viram conflitos.
  - Diff ao reimportar.
  - Checagem de publicação: natureza, vertentes, ciclos e códigos.
- [ ] Endpoints públicos de leitura do catálogo para o web, com cache.
- [ ] Seed: converter os 6 cursos e 9 ECs de `apps/web/src/data/courses.ts` em `CurriculumImportV1` e passar pelo mesmo pipeline. Os requisitos entram como `E` de todos os códigos e ficam marcados para reimportação.
- [ ] Web `/admin`:
  - Cursos.
  - Estruturas, com o editor da EC: tabela por período, painel lateral da disciplina e editor visual de expressão E/OU.
  - Vertentes e vínculo em lote.
  - Diferenças da importação, exportação em JSON, revisar e publicar.
- [ ] Web público passa a ler o catálogo da API, com o IndexedDB só como cache offline. URLs e slugs atuais não mudam.

**Pronto quando:** a grade pública é servida pela API com as mesmas URLs, e um moderador importa pela extensão, revisa e publica uma EC.

## Fase 6 — Turmas e agendas

**Objetivo:** turmas coletadas pelo backend com IDs estáveis, agendas sincronizadas para logados e importação das agendas locais. Modelagem: Turmas e agendas. Telas: `Agenda-Notificacoes` (agenda), `Mobile-Agenda`, `Importar-Agendas`, `Mobile-Importar-Agendas`.

- [ ] Tabelas: `academic_terms`, `instructors`, `class_sections`, `class_section_slots`, `class_section_instructors`, `class_section_offers` (com `reserved_seats` por curso) e `scrape_runs`.
- [ ] Job de coleta com `@nestjs/schedule`:
  - A cada 6 h, para cada curso ativo no semestre vigente e no seguinte durante a matrícula.
  - Cursos em sequência, com pausa entre eles.
  - Atualização pela chave natural, `fingerprint`, e `removed_at` para turmas que somem.
  - Disparo manual para moderadores e admins.
- [ ] Portar o scraping de `apps/web/src/app/api/scrapping` para o módulo `classes`. O route handler do web passa a chamar a API.
- [ ] `GET /terms/:term/courses/:course/sections`. Semestre vigente vem de `academic_terms` (sai do `.env`), com tela de "Semestres letivos" no admin.
- [ ] `schedules` e `schedule_items`; agregado `Schedule` usando o `academic-core`.
- [ ] Web logado:
  - O servidor é a fonte da verdade, com atualização otimista via TanStack Query.
  - Avisos de "horário mudou" (`slots_fingerprint`) e de "turma não ofertada" (`removed_at`).
- [ ] Importação no primeiro login, com `POST /me/schedules/import`:
  - O UUID local vira o id da agenda, então reenviar não duplica.
  - A resposta lista os itens não encontrados.
  - O diálogo pede confirmação do curso quando a inferência do hotfix empatou.
- [ ] Anônimo continua 100% local.

**Pronto quando:** uma agenda criada anônima é importada no login sem duplicar, e uma mudança de horário no SIGAA aparece como aviso na agenda.

## Fase 7 — Notificações

**Objetivo:** sino com contador e a infraestrutura de eventos, que as fases seguintes reutilizam. Modelagem: Notificações. Telas: `Agenda-Notificacoes` (painel), `Mobile-Notificacoes`.

- [ ] `notifications` e `hub_reads`; eventos de domínio publicados depois do commit com `@nestjs/event-emitter`.
- [ ] Agrupamento por `group_key` com upsert. Nunca notificar a própria ação nem conteúdo que o usuário não pode ver.
- [ ] Preferências: `notifications.muted` em `user_preferences`.
- [ ] Endpoints: lista paginada, contagem de não lidas, marcar como lidas.
- [ ] Polling de 60 s no web, compartilhado com o fórum, e retenção de 90 dias por job.
- [ ] Tipos desta fase: `SCHEDULE_SECTION_CHANGED`, `SCHEDULE_SECTION_REMOVED`, `SCRAPE_FAILED`, `IMPORT_PENDING`, `MODERATOR_REQUEST_CREATED` e `MODERATOR_REQUEST_REVIEWED`. Os do fórum entram na fase 11.

## Fase 8 — Arquivos

**Objetivo:** upload seguro na VM atrás da porta `FileStorage`. Modelagem: Arquivos e imagens.

- [ ] Tabela `files`; `POST /files` multipart com finalidade, validação de tipo pelos bytes e limite por finalidade.
- [ ] Reprocessamento com sharp: WebP, no máximo 2000 px e sem EXIF.
- [ ] Ciclo PENDING → ATTACHED; job diário de limpeza.
- [ ] `GET /files/:id`: públicos com cache longo; privados só para o dono.
- [ ] Volume Docker montado em `/data/uploads`.

## Fase 9 — Vida acadêmica do aluno

**Objetivo:** matrícula, histórico, horas complementares e progresso. Modelagem: Vida acadêmica do aluno. Telas: `Minha-Area`, `Historico`, `Mobile-Minha-Area`, `Mobile-Historico`, `Mobile-Historico-Registro`, `Mobile-Navegacao`.

- [ ] `student_enrollments`, `student_subject_records`, `activity_categories` e `student_activity_records`.
- [ ] Agregado `AcademicRecord` usando as regras do `academic-core`.
- [ ] Troca de EC no mesmo curso, auditada, e transferência interna, que cria nova matrícula.
- [ ] Lançamento de atividades com certificado (fase 8) e categorias por EC, cadastradas por moderadores.
- [ ] Minha área:
  - Progresso por categoria e por vertente.
  - Disciplinas cursando e liberadas para cursar.
  - Histórico filtrável por situação, com registro de disciplina em painel ou folha.
  - Aviso de "fechar situação" no fim do semestre.

## Fase 10 — Hub do curso e página de links

**Objetivo:** posts do hub e a página pública de links no estilo Linktree. Modelagem: Hub do curso, Página de links. Telas: `Hub`, `Mobile-Hub`, `Links-Pagina`, `Links-Editor`, `Mobile-Links`, `Mobile-Links-Editor`.

- [ ] `posts` e `post_images`, com validação por tipo (união do `contracts`). Corpo em Markdown com lista restrita de elementos.
- [ ] Feed com fixados primeiro e filtros por tipo, "próximos" e prazos encerrados. Posts institucionais (`course_id` nulo) só para admin.
- [ ] Badge de novidades via `hub_reads`.
- [ ] Página de links:
  - Seis tabelas (`course_link_pages`, `course_link_sections`, `course_links`, `course_social_links`, `link_clicks_daily`, `link_page_views_daily`).
  - Leitura pública em `GET /l/:slug`, com cache de 60 s.
  - Redirecionamento contado em `GET /l/:slug/go/:linkId`.
  - Ordenação em lote, agendamento de visibilidade, destaque único, selo "Novo".
  - QR code gerado no front.
- [ ] Editor com pré-visualização ao vivo, temas prontos, estilo e formato de botão, fonte do título e "links mais clicados".
- [ ] Redesenhar `Links-Pagina`, `Links-Editor`, `Mobile-Links` e `Mobile-Links-Editor` junto com a implementação, com as cores de `LINK_PAGE_THEMES` (D31) em vez das do mockup.

## Fase 11 — Fórum e moderação

**Objetivo:** fórum estilo X por curso, com menções e moderação. Modelagem: Fórum do curso. Telas: `Forum`, `Mobile-Forum`, `Mobile-Forum-Escrever`, `Forum-Mobile`, `Admin-Moderacao`, `Mobile-Admin-Moderacao`.

- [ ] `messages`, `message_likes`, `message_subject_mentions`, `message_reports`, `moderation_actions` e `user_course_restrictions`.
- [ ] Timeline de mensagens raiz com cursor `(created_at, id)`, conversa com a cadeia até a raiz e contadores atualizados na mesma transação.
- [ ] "N novas mensagens" por polling, edição em até 15 min e regras de exclusão da própria mensagem.
- [ ] Popover de `@`:
  - Busca em `GET /courses/:course/subjects/search` com trigram e debounce de 150 ms.
  - Token `@CÓDIGO` gravado no texto.
  - Chips clicáveis na leitura.
  - Aba "Discussões" na disciplina.
- [ ] Denúncias:
  - Uma por pessoa, com motivo.
  - Ocultação automática com 3 denúncias.
  - Ações de moderação com motivo.
  - MUTE e BAN com prazo.
  - Limite de envio por usuário.
- [ ] Admin › Moderação com três abas: denúncias, pedidos de moderação e restrições ativas.
- [ ] Notificações do fórum: `FORUM_REPLY`, `FORUM_THREAD_REPLY`, `FORUM_LIKES`, `MESSAGE_MODERATED` e `USER_RESTRICTED`.

## Fase 12 — Avaliação de disciplinas

**Objetivo:** notas de 1 a 5 por critério, anônimas, exibidas a partir de 5 respostas. Modelagem: Avaliação de disciplinas. Telas: `Disciplina-Avaliacao`, `Mobile-Disciplina`.

- [ ] `evaluation_criteria`, `subject_evaluations` e `subject_evaluation_scores`. Critérios geridos pelo admin.
- [ ] Só avalia quem tem `APROVADO` ou `REPROVADO` na disciplina; uma avaliação por pessoa, editável.
- [ ] Agregados na leitura (média, contagem, distribuição) só com n ≥ 5; `user_id` nunca exposto.
- [ ] Flag `EVALUATION_REQUIRE_INSTITUTIONAL_EMAIL`, desligada.

## Fase 13 — LGPD, deploy e lançamento

**Objetivo:** pôr a v2 no ar com segurança. Modelagem: Usuários (LGPD), Lacunas e riscos.

- [ ] Termos de uso e política de privacidade versionados. `GET /me/export` e exclusão de conta com as regras de apagar e anonimizar da modelagem.
- [ ] Coolify com três containers (`web`, `api`, `postgres`), volume de uploads e variáveis de ambiente documentadas.
- [ ] Revisar os riscos em aberto: backup, identidade não verificada, dependência do HTML do SIGAA.
- [ ] Release `release/v2.0.0` → `master` e `develop`, tag `v2.0.0`. Atualizar versão, README e documentos de GCS.
