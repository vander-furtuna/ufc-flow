# Estado atual do repositório

Retrato em 02/11/2026, ao fim da fase 8 (PR 8.2, o último dos dois, em PR). Atualize este arquivo ao fim de cada fase do [roadmap](roadmap.md).

## Branches

| Branch                                | Situação                                                                                                                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `master`                              | Produção (deploy no Coolify), e continua sendo (D20). `origin/HEAD` aponta para ela.                                                                                                                                                      |
| `develop`                             | Integração. Tem o monorepo e as fases 0 (PR #61), 1 (PR #63), 2 (PR #64), 3 (PR #66), 4 (PR #70), 5 (PRs #71 a #74), 6 (PRs #75 a #77) , 7 (PRs #78 a #80) 8 (PRs #81 e #82) 9 (PRs #83 a #85) e a fase 10 (PRs #86 a #89), com CI verde. |
| `feature/fase-0-fundacao`             | Mesclada em `develop` pelo PR #61; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-1-academic-core`        | Mesclada em `develop` pelo PR #63; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-2-contracts`            | Mesclada em `develop` pelo PR #64; pode ser apagada.                                                                                                                                                                                      |
| `feature/docs-redesenho-links`        | Mesclada em `develop` pelo PR #65; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-3-extensao`             | Mesclada em `develop` pelo PR #66; pode ser apagada.                                                                                                                                                                                      |
| `fix/dependency-audit`                | Mesclada em `develop` pelo PR #67; pode ser apagada.                                                                                                                                                                                      |
| `hotfix/dependency-audit`             | Mesclada em `master` pelo PR #68; pode ser apagada.                                                                                                                                                                                       |
| `chore/sync-master`                   | Mesclada em `develop` pelo PR #69; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-4-api-identidade`       | Mesclada em `develop` pelo PR #70; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-5-catalogo-api`         | Mesclada em `develop` pelo PR #71; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-5-extensao-envio`       | Mesclada em `develop` pelo PR #72; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-5-admin-web`            | Mesclada em `develop` pelo PR #73; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-5-web-catalogo`         | Mesclada em `develop` pelo PR #74; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-6-turmas-api`           | Mesclada em `develop` pelo PR #75; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-6-agendas-api`          | Mesclada em `develop` pelo PR #76; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-6-agenda-web`           | Mesclada em `develop` pelo PR #77; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-7-notificacoes-api`     | Mesclada em `develop` pelo PR #78; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-7-notificacoes-web`     | Mesclada em `develop` pelo PR #79; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-7-agenda-redesenho`     | Mesclada em `develop` pelo PR #80; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-8-arquivos-api`         | Mesclada em `develop` pelo PR #81; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-8-arquivos-web`         | Mesclada em `develop` pelo PR #82; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-9-historico-api`        | Mesclada em `develop` pelo PR #83; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-9-historico-web`        | Mesclada em `develop` pelo PR #84; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-9-horas-complementares` | Mesclada em `develop` pelo PR #85; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-10-hub-api`             | Mesclada em `develop` pelo PR #86; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-10-links-api`           | Mesclada em `develop` pelo PR #87; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-10-hub-web`             | Mesclada em `develop` pelo PR #88; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-10-links-web`           | Mesclada em `develop` pelo PR #89; pode ser apagada.                                                                                                                                                                                      |
| `feature/fase-11-forum-api`           | Fase 11, PR 11.1 (fórum na API), em PR para `develop`.                                                                                                                                                                                    |
| `feature/monorepo`                    | Mesclada em `develop`; pode ser apagada.                                                                                                                                                                                                  |
| `hotfix/schedule-course-key`          | Já mesclada em `master` e `develop`; pode ser apagada.                                                                                                                                                                                    |

A `main` foi apagada no remoto (D20). As branches já mescladas ficam por enquanto.

## Concluído

- **Hotfix das agendas locais** (commit `aa4dafa`). O id da EC (ex.: `2006.2`) se repete entre cursos (2006.2 aparece em 4 cursos e 2025.1 em 2), e as agendas vazavam entre eles. Agora cada agenda grava `courseSlug` e `curriculumSlug`. Agendas antigas são migradas ao abrir um curso por `apps/web/src/utils/resolve-schedule-course.ts`, nesta ordem:
  1. EC com id único: a agenda vai para o único curso que a tem.
  2. Mais de um curso: vence o que tem mais disciplinas da agenda.
  3. Empate ou agenda vazia: fica com o curso aberto, se ele estiver entre os empatados.
  4. Sem decisão: a agenda fica sem curso e é reavaliada depois.
- **Monorepo** (commits `af7ea8f` e `67e38bb` em `feature/monorepo`):
  - O front foi movido para `apps/web`, com histórico.
  - Placeholders tipados para `apps/api`, `apps/extension`, `packages/contracts` e `packages/academic-core`.
  - `turbo.json`, `pnpm-workspace.yaml` (com catálogo de versões e `allowBuilds`) e `tsconfig.base.json`.
  - O `next.config.mjs` rastreia o build standalone a partir da raiz.
  - O Dockerfile usa pnpm e inicia o servidor em `apps/web/server.js`. O CI também usa pnpm.
  - README, `CONFIGURATION_ITEMS.md` (IC-023 e IC-024) e `PLANO_GERENCIAMENTO_CONFIGURACAO.md` foram atualizados.
- **Fase 0 — Fundação** (branch `feature/fase-0-fundacao`):
  - `pnpm-lock.yaml` commitado; `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check` e `pnpm build` passam.
  - Lint com oxlint e type-aware (`.oxlintrc.json` na raiz). As regras do React Compiler vêm do plugin JS `react-hooks-js`. Zero avisos: as regras de `jsx-a11y` valem como erro.
  - Prettier na raiz, com o repositório inteiro formatado e as quebras de linha normalizadas para LF.
  - Vitest com config por pacote e tarefa `test` no Turborepo.
  - `set-state-in-effect` corrigido nos contexts `schedule`, `class` e `calendar`.
  - IndexedDB unificado no `UFCFlowDB` v7, com migração e testes (`apps/web/src/lib/ufc-flow-db.test.ts`).
  - `docker/compose.dev.yml` (PostgreSQL 17) e `apps/api/.env.example`.
  - CI em PRs para `develop` e `master`, com formatação e testes.
- **Fase 1 — `packages/academic-core`** (branch `feature/fase-1-academic-core`):
  - Requisitos (`RequirementExpr`): parse do texto do SIGAA, formatação, normalização, códigos citados, avaliação com equivalências e detecção de ciclos.
  - Termo letivo, conflito de horário e regras da agenda.
  - Regras do histórico, progresso de integralização e disciplinas liberadas.
  - Menções `@CÓDIGO` e normalização de busca.
  - 176 testes, cobertura acima de 90% (mínimo configurado no `vitest.config.ts` do pacote). Sem dependências de execução.
  - O web usa o conflito de horário (`utils/check-time-conflict.ts` virou adaptador) e a normalização (`utils/normalize-words.ts` reexporta) do pacote.
  - Mesclada pelo PR #63 e conferida no navegador (agenda com e sem conflito, busca de disciplinas).
- **Fase 2 — `packages/contracts`** (branch `feature/fase-2-contracts`):
  - Enums da modelagem, com os do core tipados contra ele (D29), e o tipo de componente (D30).
  - `RequirementExpr` recursivo, que só aceita a forma normalizada.
  - `CurriculumImportV1` estrito, com checagem de coerência das vertentes (D33).
  - Problem Details, `validationProblem` e paginação por cursor (D32).
  - Posts do hub como união discriminada por `type`.
  - Tokens dos temas da página de links, com contraste AA testado (D31).
  - `toJsonSchema` e `toOpenApiComponents()` para o Swagger. O Ajv confere exemplos contra o JSON Schema gerado.
  - Fixture `fixtures/engenharia-de-computacao-2006-2.json`, com os 114 componentes do HTML real do SIGAA e os `OU` preservados.
  - 168 testes e cobertura acima de 90%. O `academic-core` passou a exportar `SUBJECT_CODE_PATTERN` e `TERM_PATTERN`.
- **Fase 3 — Extensão** (branch `feature/fase-3-extensao`):
  - A cópia de trabalho de `sigaa-classes-scraping` foi migrada para `apps/extension` (commit só de cópia) e substituída. Plasmo 0.90 no workspace, React 19, Tailwind 4 pela CLI e zod empacotado com o esbuild (detalhes na modelagem, Monorepo e arquitetura).
  - Parser novo em `src/sigaa/`, lendo a página nó a nó. Os 1.118 textos de requisito de 11 ECs reais viram expressão sem falha.
  - O parser lê ênfases com código e cargas, grupos com mínimos e máximos (também dentro de ênfases), componentes anuais e o semestre das optativas como o SIGAA mostra.
  - Código do curso (D34): a extensão captura o curso selecionado na tela de busca, reconhece pelo cabeçalho (`matchSigaaCourse`, no `academic-core`) ou deixa escolher, com o catálogo dos 170 cursos da lista pública embutido.
  - Aba Revisar com a checagem da leitura: curso, componentes, requisitos com `OU` e ciclos, vertentes, códigos fora da EC e o que não foi entendido. O JSON só sai sem itens em vermelho.
  - Interface nova:
    - popup (início, estrutura detectada, login atrás da flag) nos temas claro e escuro;
    - botão flutuante no SIGAA;
    - painel com Grade, Vertentes, Regras da EC e Revisar;
    - página de prévia que abre uma estrutura salva.
  - Contrato e core: `CurriculumImportV1` com ênfases, grupos, código e vigor da EC e `course.recognition` (D34–D40); `findDependents` no core. A fixture do `contracts` passou a ser gerada pelo parser, o que corrigiu cargas de aula, laboratório e créditos gravadas erradas na fase 2.
  - Login e envio atrás de `PLASMO_PUBLIC_FLOW_SYNC`, desligada (D41): por enquanto só o download do JSON.
  - 144 testes na extensão (cobertura acima de 90% em `src/sigaa` e `src/lib`), 201 no core e 181 no contracts. O fluxo completo foi conferido no Edge headless com o SIGAA simulado pelas fixtures.
- **Fase 4 — API e identidade** (branch `feature/fase-4-api-identidade`):
  - `apps/api`: NestJS 12 em ESM, hexagonal por módulo, com `shared/` (DomainError, Result, Clock, IdGenerator, cursor, `AccessPolicy`, Problem Details, validação pelo `contracts`) e `database/` (Drizzle, migrations do `drizzle-kit` em `apps/api/drizzle`). Detalhes nas D42 a D49.
  - Módulo `identity`: as 9 tabelas da modelagem, cadastro com aceite (versão `0.1`, D46), login, refresh com rotação e revogação por família, saída, `GET /me`, link de redefinição gerado pelo admin, pedidos de moderação com aprovação, rejeição e cancelamento, e auditoria.
  - `catalog` mínimo: `campuses` e `courses` com `GET /v1/courses` e o seed dos 6 cursos (D47).
  - Swagger em `/docs` com Bearer, Problem Details em todas as rotas, `openapi.json` versionado e teste que exige resumo, respostas e 401 documentado. Basic Auth ou `SWAGGER_ENABLED=false` em produção.
  - Comandos: `db:migrate`, `seed:courses` (trocado pelo `seed:catalog` na fase 5), `seed:admin --email --name` e `openapi`.
  - Testes: 82 unitários (cobertura de 99% em domínio e aplicação) e 18 de integração (repositórios e e2e com supertest) contra Postgres no Testcontainers, os dois no CI.
  - Web como BFF (D48): `/entrar` (telas `Main` e `Mobile-Entrar`), `/redefinir-senha`, `/termos` e `/privacidade`, menu do usuário no header e renovação da sessão no `proxy.ts`. Testes de formulário com Testing Library. Fluxo conferido no Edge headless contra a API local: cadastro, menu, renovação sem o access token, saída, senha errada e link inválido.
  - Extensão: login do popup ligado à API, com a sessão em `chrome.storage.local` (D50); continua atrás de `PLASMO_PUBLIC_FLOW_SYNC`.
- **Fase 5 — PR 5.1, API do catálogo e da ingestão** (branch `feature/fase-5-catalogo-api`):
  - Contratos novos no `contracts`: curso e EC (pública e de gestão), pontos para revisar, checagem de publicação, entradas de edição, catálogo do SIGAA e ingestão (diff, página, detalhe).
  - Domínio do `catalog`: agregado `Curriculum` com uma linha de teste por regra da tabela "Ciclo de vida e edição", disciplina global, checagem de publicação, pontos para revisar, plano de importação, diff e aplicação sob as mesmas travas.
  - 11 tabelas novas e a FK `courses.sigaa_id → sigaa_courses` (migration `0001_catalog`, com `pg_trgm` e preenchimento provisório dos cursos da fase 4).
  - Rotas: leitura pública com cache, gestão em `/v1/manage`, admin em `/v1/admin` e ingestão em `/v1/ingestion/curriculum-imports` (D52 a D59). Leitura semanal da lista pública do SIGAA.
  - `seed:catalog` no lugar do `seed:courses`: os 9 ECs do `courses.ts` publicados pelo pipeline, com os slugs de hoje (inclusive `/ciencias-economicas/2005-1`).
  - Testes: 188 unitários na API (cobertura de 99% em domínio e aplicação), 4 arquivos de integração e e2e com 25 testes (o e2e importa a EC real de 114 componentes e confere os `OU` e o 304 do cache), 251 no `contracts`.
- **Fase 5 — PR 5.2, envio pela extensão** (branch `feature/fase-5-extensao-envio`):
  - Service worker com as chamadas à API; envio pelo painel com os modais de rascunho criado, curso pendente e diferenças a conferir; envios recentes no popup.
  - Catálogo do SIGAA lido da API, com cache de um dia e o JSON embutido como reserva; aviso na aba Revisar dos nomes diferentes do catálogo do Flow (rota nova `GET /v1/subjects?codes=`).
  - Conferido no Edge headless contra a API local, com o SIGAA simulado pelas fixtures: rascunho novo (Agronomia), curso pendente (Medicina - Sobral), reimportação (Música) e o aviso de nome divergente.
  - 201 testes na extensão (cobertura acima de 90% em `src/lib` e `src/sigaa`).
- **Fase 5 — PR 5.3, área `/admin` no web** (branch `feature/fase-5-admin-web`):
  - Estruturas (lista e editor), importações (lista, upload do JSON, diff, aplicar e descartar) e cursos (só admin: criar a partir do catálogo do SIGAA, ocultar, excluir, atualizar o catálogo).
  - Editor da EC: pontos para revisar, tabela por período (cartões no celular ou com o painel aberto), painel da disciplina com editor visual E/OU, vertentes, vínculo em lote, cabeçalho, exportação, publicação e vigente.
  - Testes do editor de expressão (modelo puro e componente com Testing Library). Conferido no Edge headless contra a API local, em 1440 e 390 px, nos temas claro e escuro.
- **Fase 5 — PR 5.4, web público lendo a API** (branch `feature/fase-5-web-catalogo`):
  - O layout raiz carrega o catálogo no servidor (D65) e o `courses.ts` sai do bundle do cliente; sem `API_URL`, continua o `courses.ts` (D51).
  - Mapper das respostas da API para os tipos do front, com testes. As 9 URLs de hoje existem na API com as mesmas contagens (Eng. de Computação tem 114 componentes, dos dados reais do SIGAA).
  - As optativas aparecem no período em que o SIGAA as põe, o último (D66).
  - Conferido contra a API local: lista de cursos, grades (inclusive `/ciencias-economicas/2005-1`), página da disciplina e agenda, sem erro no console.
- **Fase 6 — PR 6.1, turmas na API** (branch `feature/fase-6-turmas-api`):
  - Módulo `classes` na API: semestres letivos, turmas com chave natural e `fingerprint`, ofertas por curso com as vagas reservadas, `removed_at` e `scrape_runs`. Migration `0002_classes`.
  - Coleta da página pública de turmas do SIGAA (sem login), a cada 6 horas, do vigente e dos semestres que começam nos próximos 45 dias (D68), com pausa entre cursos; disparo manual por moderador do curso ou admin.
  - Rotas públicas `GET /v1/terms`, `/v1/terms/current` e `/v1/terms/{term}/courses/{course}/sections`; admin de semestres em `/v1/admin/terms`.
  - Web: `/admin/semestres` (semestres e coleta manual), semestre vigente vindo da API e `/api/scrapping` lendo a API com o SIGAA como reserva (D69).
  - Fixture anonimizada do SIGAA com dois docentes, aula partida no mesmo dia, internato com vários blocos de datas (D70) e sábado.
  - Conferido contra o SIGAA real e a API local: coleta dos 7 cursos do dev (Eng. de Computação com 76 turmas), ids estáveis entre leituras e a página do admin em 1440 e 390 px, claro e escuro.
- **Fase 6 — PR 6.2, agendas na API** (branch `feature/fase-6-agendas-api`):
  - Módulo `planning`: `schedules` (com curso, EC e semestre, D71) e `schedule_items`, migration `0003_planning`. Agenda some com a conta (LGPD).
  - Agregado `Schedule` com as regras do `academic-core`: turma nova não repete disciplina, não conflita e não está removida; as que já estavam ficam, com aviso (D72).
  - Rotas `GET`, `PUT` e `DELETE` em `/v1/me/schedules` e `POST /v1/me/schedules/import`, com os avisos `changed` e `removed`.
  - E2e com a fixture do SIGAA: agenda inteira pelo id do cliente, conflito, agenda alheia, mudança de horário, importação repetida sem duplicar, separação por EC e exclusão em cascata com a conta.
- **Fase 6 — PR 6.3, agenda logada no web** (branch `feature/fase-6-agenda-web`):
  - O contexto da agenda tem dois modos: anônimo (IndexedDB, como antes) e conta (API, com atualização otimista e reversão). Status de sincronização na barra lateral.
  - Avisos de horário alterado ("Ciente" dispensa) e de turma fora do SIGAA ("Tirar da agenda"), com a turma marcada no calendário.
  - Diálogo de importação no primeiro login (Dialog no desktop, folha inferior no celular), com a conferência prévia das turmas coletadas e o seletor de curso para EC antiga.
  - A cor `fuschia` virou `fuchsia` (D72), com conversão das agendas locais antigas.
  - Testes do mapeador, da inferência de curso, do diálogo e do contexto no modo conta. Conferido no Edge headless contra a API local, com turmas reais: importação, mudança de horário e remoção simuladas no banco, em 1440 e 390 px, claro e escuro.
- **Fase 7 — PR 7.1, notificações na API** (branch `feature/fase-7-notificacoes-api`):
  - Porta `EventPublisher` no `shared`, com `@nestjs/event-emitter`. Publicam depois do commit: pedido e resposta de moderação, importação esperando curso, falha de coleta e turmas alteradas ou removidas (a coleta agora informa quais).
  - Módulo `notifications` (migration `0004_notifications`): os 6 tipos da fase, com agrupamento, sem notificar a própria ação e com tipos silenciados; lista paginada, contador, marcar como lidas, preferências e o job diário de retenção.
  - E2e do fluxo completo (moderação, agenda com turma alterada, falha de coleta e preferência silenciada) e integração com o Postgres.
- **Fase 7 — PR 7.2, sino e painel no web** (branch `feature/fase-7-notificacoes-web`):
  - Sino com contador no cabeçalho, na barra lateral da agenda (com o menu da conta) e no admin; contador relido a cada 60 s.
  - Painel no desktop (mockup `Agenda-Notificacoes`) e página `/notificacoes` (mockup `Mobile-Notificacoes`), com marcar como lidas, filtro de não lidas e grupos por dia.
  - Preferências por categoria, só com os tipos que a pessoa pode receber.
  - Testes dos textos de cada tipo e do sino (Testing Library). Conferido no Edge headless contra a API local, em 1440 e 390 px, claro e escuro.
- **Fase 7 — PR 7.3, redesenho da agenda** (branch `feature/fase-7-agenda-redesenho`):
  - Barra lateral como no mockup `Agenda-Notificacoes`: curso, semestre, controles de 44 px, status, avisos e o resumo "Na agenda" (disciplinas, carga horária e "mudou"/"saiu"), com a lista do curso abaixo.
  - Calendário com as medidas do mockup (linhas de 56 px, blocos arredondados com horário e turma) e nomes do SIGAA em título.
  - Celular como no `Mobile-Agenda`: nomes abreviados nos blocos, aviso compacto que abre a lista e barra flutuante com o status curto.
  - Conferido no Edge headless contra a API local, com uma agenda real e uma mudança de horário simulada, em 1440 e 390 px, claro e escuro.
- **Fase 8 — PR 8.1, arquivos na API** (branch `feature/fase-8-arquivos-api`):
  - Módulo `files` (migration `0005_files`): portas `FileStorage` (disco local em `UPLOADS_DIR`) e `ImageProcessor` (sharp: WebP, 2000 px, sem EXIF); tipo pela assinatura dos bytes, limites por finalidade e 60 envios por hora (D75).
  - `POST /v1/files` e `GET /v1/files/{id}` (público com cache imutável; privado só para o dono); limpeza diária de pendentes, soltos e órfãos.
  - Foto de perfil: `PUT`/`DELETE /v1/me/avatar`, FK `users.avatar_file_id` e `avatarFileId` no `Me`.
  - E2e com foto de celular de verdade (3000 px com EXIF e GPS): sai WebP de 2000 px sem metadados; PDF disfarçado de JPEG é recusado.
- **Fase 8 — PR 8.2, arquivos no web** (branch `feature/fase-8-arquivos-web`):
  - Rotas do BFF: `/api/files` (upload com o token do cookie, renovado pelo `proxy.ts`) e `/arquivos/{id}` (entrega com os cabeçalhos de cache da API).
  - Foto de perfil no menu da conta: "Adicionar/Alterar foto" e "Remover foto", com a foto no lugar das iniciais.
  - Conferido no Edge headless contra a API local: foto com EXIF enviada pelo menu, entregue em WebP com cache imutável e removida.
- **Fase 9 — PR 9.1, vida acadêmica na API** (branch `feature/fase-9-historico-api`):
  - `academic-core`: progresso revisto (D40, D77), com o componente `COMPLEMENTARY_ACTIVITY` fora das obrigatórias, ênfases exigidas e permitidas e `overMax` nos grupos (D37); `isCloseReminderDue` (21 dias).
  - `contracts`: matrícula, registro, fechamento, atividade, categoria e o resumo `AcademicSummary`.
  - Módulo `academic-record` (migration `0006_academic_record`): matrículas com transferência interna e migração de EC auditada, histórico pelo agregado `AcademicRecord`, atividades com certificado e categorias por EC para moderadores (D78). O semestre fica como código (D76).
  - `GET /v1/me/enrollments/{id}/summary` calcula o progresso, as liberadas e o aviso de fechar situação sob demanda.
  - A contagem de matrículas do catalog é real: EC publicada com matrícula fica travada no editor. O ator da `AccessPolicy` passa a ter os cursos da matrícula atual.
- **Fase 9 — PR 9.2, Minha área no web** (branch `feature/fase-9-historico-web`):
  - `/minha-area`: curso vigente, integralização com a previsão pelo ritmo da EC, progresso por categoria e por vertente, aviso de fechar situação, cursando e liberadas (com "Montar agenda").
  - `/minha-area/historico`: filtro por situação com contagens, semestres antigos recolhidos, média do semestre, "nova tentativa disponível", fechar situação e excluir registro. O registro fica no painel lateral (desktop) ou numa folha inferior (celular), com campos que mudam com a situação e a busca de disciplina fora da EC pelo código.
  - `/minha-area/agendas` lista as agendas da conta. Primeira matrícula, "Gerenciar matrículas" (transferência) e "Migrar de estrutura curricular" em diálogos.
  - Menu de navegação como no `Mobile-Navegacao` e "Minha área" no menu da conta (D79).
  - Conferido no Edge headless contra a API local com um histórico de 33 registros, em 1440 e 390 px, claro e escuro: registro, fechamento de situação, aviso de fim de semestre e primeiro acesso. As contas de teste foram apagadas.
- **Fase 9 — PR 9.3, horas complementares** (branch `feature/fase-9-horas-complementares`):
  - Aba `/minha-area/horas`: complementares por categoria (declaradas e contadas com o teto), extensão, lista filtrável por tipo, lançar, editar e excluir atividade com certificado (D80).
  - Cartão "Horas complementares" no Progresso, como no mockup `Minha-Area`.
  - Admin: "Atividades" no editor de EC cria, edita e remove as categorias com teto de horas.
  - Conferido no Edge headless contra a API local: atividade lançada pela tela com certificado em PDF (entregue só para a dona, 404 sem login) e categorias no admin. Contas, categorias e arquivos de teste foram apagados.
- **Fase 10 — PR 10.1, hub na API** (branch `feature/fase-10-hub-api`):
  - Módulo `hub` (migration `0007_hub`): `posts`, `post_images` e `hub_reads`; feed com fixados, filtros por tipo e "próximos", busca sem acentos e cursor; post pelo slug; próximos prazos; criar, editar e excluir para moderadores do curso e admins; institucional só para admin (D81 a D84).
  - Capa e galeria ligadas pelo módulo de arquivos; admin envia imagens de post institucional sem curso (D82).
- **Fase 10 — PR 10.2, página de links na API** (branch `feature/fase-10-links-api`):
  - Módulo `link-page` (migration `0008_link_page`): as seis tabelas, com um alvo por tipo de link (CHECK) e um destaque por página (índice único parcial).
  - Editor para moderadores do curso e admins: página criada no primeiro acesso, aparência e publicação, seções, links, redes, ordem em lote e estatísticas de 7 ou 30 dias (D86, D89).
  - Leitura pública com cache de 60 s, clique contado por dia e origem com redirecionamento 302, visitas e a prévia de 5 links para o hub (D85, D89).
- **Fase 10 — PR 10.3, hub no web** (branch `feature/fase-10-hub-web`):
  - `/{curso}/hub` (mockups `Hub` e `Mobile-Hub`): post fixado com capa, feed por tipo com "Carregar mais", busca na barra flutuante, links importantes e próximos prazos; a moderação vê rascunhos e arquivados e cria posts (D88, D90).
  - Página do post em `/{curso}/hub/{slug}`, renderizada no servidor: ficha por tipo, Markdown restrito (`react-markdown`), galeria e, para a moderação, editar e excluir.
  - Formulário em `/{curso}/hub/novo` e `.../editar`, validado pelo `postInputSchema`, com capa e galeria pelo módulo de arquivos e post institucional para admin.
  - Abas Grade e Hub no cabeçalho do curso e "Hub do curso" no menu, com o contador de novidades; abrir o hub zera (D84). Rota `/l/{slug}/go/{id}` do web, que repassa o 302 da API.
  - Conferido no Edge headless contra a API local, em 1440 e 390 px, claro e escuro. Posts, página de links e arquivos de teste foram apagados.
- **Fase 10 — PR 10.4, página de links no web** (branch `feature/fase-10-links-web`):
  - `/l/{slug}` (mockups `Links-Pagina` e `Mobile-Links`, com as cores de `LINK_PAGE_THEMES`): perfil, redes, destaque, seções, selos "Novo" e "PDF", compartilhar, copiar e QR code (`qrcode`); visitas e cliques com a origem da página, do QR ou do hub (D91).
  - Editor em `/{curso}/hub/links` (mockups `Links-Editor` e `Mobile-Links-Editor`): links de endereço, arquivo, tela do Flow e post do hub, com ícone ou miniatura, destaque, selo, período e visibilidade; seções e redes; ordem por arrastar (`@dnd-kit`, também pelo teclado); aparência com pré-visualização ao vivo; estatísticas de 7 ou 30 dias.
  - Hub: "Editar" e "Ver página" nos links importantes e o convite para a moderação montar a página.
  - Conferido no Edge headless contra a API local, em 1440 e 390 px. Página de links, post e arquivos de teste foram apagados.
- **Fase 11 — PR 11.1, fórum na API** (branch `feature/fase-11-forum-api`):
  - Módulo `forum` (migration `0009_forum`): `messages`, `message_likes` e `message_subject_mentions`, com os contadores na mesma transação.
  - Timeline de raízes com cursor, "N novas", conversa com a cadeia até a raiz, respostas, edição em 15 min, apagar a própria, curtir; menções `@CÓDIGO` resolvidas pelo `academic-core`, até 5 por mensagem.
  - Busca de disciplinas para o `@` (EC vigente primeiro), mais citadas na semana e mensagens por disciplina; limite de envio configurável (D92).
  - Notificações `FORUM_REPLY`, `FORUM_THREAD_REPLY` e `FORUM_LIKES` (agrupadas), já com textos e preferências no web.
- **Modelagem v2 fechada** ([modelagem.md](modelagem.md)), com 92 decisões (D1–D92) e 11 lacunas resolvidas (L1–L11).
- **39 telas desenhadas** para desktop, mobile e extensão ([telas.md](telas.md)).

## Pendências imediatas

1. Mesclar o PR 11.1. Depois vêm o 11.2 (moderação na API), o 11.3 (fórum no web) e o 11.4 (moderação no web). As categorias de cada curso precisam ser cadastradas pelos moderadores, conforme os regulamentos. O volume Docker em `/data/uploads` entra com o deploy, na fase 13.
2. Testar localmente:
   - `docker compose -f docker/compose.dev.yml up -d`;
   - na API, copiar `.env.example` para `.env`, `pnpm --filter @ufc-flow/api db:migrate`, `seed:admin -- --email <e-mail> --name <nome>` e `seed:catalog`;
   - em `/admin/semestres`, cadastrar o semestre, marcá-lo como vigente e coletar as turmas (ou esperar o job de 6 horas);
   - `pnpm --filter @ufc-flow/api dev` (porta 3333, Swagger em `/docs`) e `pnpm dev:web`, com `API_URL` no `apps/web/.env.local`;
   - extensão: `pnpm --filter @ufc-flow/extension build`, carregar `apps/extension/build/chrome-mv3-prod`, entrar pelo popup e enviar uma estrutura pelo painel no SIGAA.

As telas de links foram redesenhadas no código com os temas de `LINK_PAGE_THEMES` (D31); os PNG e HTML em `docs/v2/telas` ainda mostram os destaques antigos.

Próximo passo: PR 11.2 (moderação na API).

## Segurança das dependências

Auditoria de 01/11/2026 (`pnpm audit` na `develop` e alertas do Dependabot na `master`):

- **`develop`:** nada vulnerável no que vai para produção (site e bundle da extensão). Os overrides do `pnpm-workspace.yaml` sobem sharp, msgpackr, browserslist, content-security-policy-parser, fflate, tsup, esbuild, vue e svelte na cadeia de build do Plasmo. De 21 avisos (8 altos), sobraram 3, aceitos por não terem correção compatível:
  - `@parcel/reporter-dev-server` (moderado): preso ao Parcel 2.9 do Plasmo. Só roda durante o `plasmo dev`; evite navegar em sites desconhecidos com o `pnpm dev` da extensão aberto.
  - `deepmerge` (baixo): sem versão corrigida; usado só no build, com a configuração do projeto.
  - `minimatch` 3 (moderado): vem do ESLint que o plugin de lint do React carrega; a correção (v11) muda a API que o ESLint usa. Só roda no lint, com globs do projeto.
- **`master`:** os alertas do Dependabot vinham do `package-lock.json`, que o build de produção não usa (o Dockerfile instala pelo `bun.lock`). O hotfix do PR #68 sincronizou o `bun.lock` e corrigiu undici, zod e source-map-js.
- O Plasmo não tem versão nova desde maio de 2025 e prende o Parcel 2.9. Se a cadeia de build acumular avisos sem correção, vale avaliar trocar de framework de extensão (ver Lacunas na modelagem).

## Divergências entre a modelagem e o repositório

| Modelagem diz                 | Repositório hoje               | O que vale      |
| ----------------------------- | ------------------------------ | --------------- |
| Caminho `src/data/courses.ts` | `apps/web/src/data/courses.ts` | O novo caminho. |

## Como o web funciona hoje (o que a v2 substitui)

- **Rotas** (`apps/web/src/app`):
  - `/cursos`: lista de cursos.
  - `/[courseSlug]/[curriculumSlug]`: grade com fluxo React Flow.
  - `/[courseSlug]/[curriculumSlug]/[subjectCode]`: detalhe da disciplina.
  - `/[courseSlug]/[curriculumSlug]/agenda`: simulador de agenda.
  - `/restaurante` e `/calendario`.
  - Route handlers: `api/scrapping` (turmas do SIGAA), `api/ru`, `api/ru/week`, `api/calendar`, `api/save-slug`.
- **Dados acadêmicos:** estáticos em `apps/web/src/data/courses.ts`, com 6 cursos e 9 ECs. Os pré-requisitos são listas de códigos e perderam o `OU`. Tipos em `apps/web/src/types/course.ts`.
- **Turmas:** `api/scrapping` faz o scraping do SIGAA (got + cheerio) a cada consulta. Cada turma ganha um `randomUUID()` novo a cada consulta, então não há IDs estáveis.
- **Estado no cliente:** contexts em `apps/web/src/contexts` (`course`, `class`, `schedule`, `filter`, `calendar`, `tools`).
- **Persistência local:** IndexedDB `UFCFlowDB` v7, aberto por `apps/web/src/lib/ufc-flow-db.ts`, com os stores `schedules` (cache de turmas), `user_schedules` (agendas), `user_preferences`, `academic_calendar`, `ru_menus`, `filters` e `tools`. O acesso é feito por `apps/web/src/lib/indexeddb.ts` e `apps/web/src/storage/indexed-db`. O antigo `ufc-flow-indexeddb` é copiado e apagado na primeira abertura da v7.
- **Semestre vigente:** variáveis `NEXT_PUBLIC_CURRENT_YEAR` e `NEXT_PUBLIC_CURRENT_SEMESTER`. Na v2 isso passa para `academic_terms.is_current`.
- **Deploy:**
  - Produção: o Coolify faz o build do `Dockerfile` da raiz. A saída é standalone do Next, na porta 3000.
  - Testes: o Vercel publica o web a cada push, para pré-visualização. Não é produção, e o Dockerfile não é usado lá.
