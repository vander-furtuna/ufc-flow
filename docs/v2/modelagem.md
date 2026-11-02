# UFC Flow — Modelagem v2

> Cópia versionada do documento [UFC Flow — Modelagem v2](https://claude.ai/artifact/UMzzHykJMZDD9gwt7Mdi7K) (revisão 28, exportada em 31/10/2026). **Este arquivo é a fonte de verdade dentro do repositório.** Mudanças de modelagem são feitas aqui, num PR, junto com o código que as implementa. Autor: Vanderlei Furtuna.
>
> Divergências entre este texto e o estado atual do repositório estão listadas em [estado-atual.md](estado-atual.md).

## Visão geral e escopo

A v2 do UFC Flow troca os dados estáticos do front (`src/data/courses.ts`) por uma API NestJS + PostgreSQL (Drizzle). Ela adiciona contas de usuário, histórico acadêmico, agendas sincronizadas, hub do curso, fórum e avaliação de disciplinas. A plataforma continua utilizável sem login: grade, turmas e agenda local seguem abertas.

**Entra na v2**

- Catálogo acadêmico no banco: cursos, estruturas curriculares (ECs), disciplinas, vertentes, requisitos e equivalências.
- Turmas coletadas pelo backend, com IDs estáveis.
- Usuários, papéis (aluno, moderador, admin) e solicitação de moderação.
- Histórico do aluno, horas complementares e progresso de integralização.
- Agendas: locais para anônimos, sincronizadas para logados.
- Hub do curso (posts e links), fórum estilo X e avaliação quantitativa de disciplinas.
- Imagens armazenadas na própria VM.
- Área de edição de grades (as funções do course-maker) dentro do UFC Flow, num monorepo com API e extensão.

**Continua como está**

- Cardápio do RU e Calendário Acadêmico: seguem como route handlers do Next com cache no IndexedDB. Não fazem parte da modelagem.

**Fica para depois**

- Tudo que depende de SMTP: verificação de e-mail, recuperação de senha por e-mail, notificações por e-mail.
- Backup do banco e dos arquivos para fora da VM.

## Registro de decisões

Cada linha é uma decisão já tomada e onde ela aparece na modelagem. Mudar uma decisão exige revisar a seção indicada.

| #   | Tema                               | Decisão                                                                                                                                                                                                                                                                                                              | Consequência na modelagem                                                           |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| D1  | Turmas                             | O backend faz o scraping do SIGAA e guarda as turmas no Postgres                                                                                                                                                                                                                                                     | IDs estáveis; agenda referencia `class_sections.id` (seção Turmas e agendas)        |
| D2  | Agenda sem login                   | Anônimo usa IndexedDB; logado sincroniza; importação das agendas locais no primeiro login                                                                                                                                                                                                                            | `schedules.id` gerado no cliente (UUID) para importação idempotente                 |
| D3  | EC vigente                         | Definida pela Pró-Reitoria de Graduação, nem sempre a mais recente                                                                                                                                                                                                                                                   | Flag explícita `is_current`, marcada manualmente, uma por curso                     |
| D4  | EC publicada                       | Só muda o que não prejudica registros ligados a ela                                                                                                                                                                                                                                                                  | Regra de edição "monotônica" + log de auditoria                                     |
| D5  | Equivalências                      | Globais                                                                                                                                                                                                                                                                                                              | Ficam na disciplina (`subject_equivalences`), não na EC                             |
| D6  | Fórum                              | Assíncrono, no modelo do X/Twitter                                                                                                                                                                                                                                                                                   | Mensagens com respostas encadeadas, curtidas, feed paginado por cursor              |
| D7  | Menções                            | Digitar `@` abre um popover de busca por nome ou código da disciplina                                                                                                                                                                                                                                                | Token `@CÓDIGO` no texto + tabela de menções gravada na escrita + endpoint de busca |
| D8  | Repositórios                       | Monorepo com web, API e extensão; course-maker absorvido pelo web                                                                                                                                                                                                                                                    | `apps/web`, `apps/api`, `apps/extension`, `packages/*`                              |
| D9  | ORM                                | Drizzle                                                                                                                                                                                                                                                                                                              | Schema em `apps/api/src/infrastructure/database/schema`                             |
| D10 | RU e Calendário                    | Permanecem como estão                                                                                                                                                                                                                                                                                                | Fora do banco                                                                       |
| L1  | Situação da disciplina             | Cursando, aprovado, reprovado, trancada, suprimida, aproveitada                                                                                                                                                                                                                                                      | Enum `record_status` + regras de nova tentativa                                     |
| L2  | EC do aluno                        | A matrícula aponta para a EC que o aluno segue                                                                                                                                                                                                                                                                       | `student_enrollments.curriculum_id`                                                 |
| L3  | Moderação                          | Usuário solicita, admin aprova                                                                                                                                                                                                                                                                                       | `moderator_requests`                                                                |
| L4  | Vínculo institucional              | E-mail `@alu.ufc.br` para avaliar e postar                                                                                                                                                                                                                                                                           | Modelado, mas sem SMTP não há como verificar (ver Lacunas)                          |
| L5  | Anonimato das avaliações           | Só agregados, a partir de 5 respostas                                                                                                                                                                                                                                                                                | Regra na leitura; `user_id` nunca exposto                                           |
| L6  | Horas complementares               | Lançadas pelo aluno                                                                                                                                                                                                                                                                                                  | `student_activity_records` + categorias por EC                                      |
| L7  | LGPD                               | Termos, privacidade, exclusão e exportação de dados                                                                                                                                                                                                                                                                  | `user_consents`, rotina de exclusão com anonimização                                |
| L8  | SMTP                               | Fora da v2                                                                                                                                                                                                                                                                                                           | Nada de verificação ou recuperação por e-mail                                       |
| L9  | Imagens                            | Armazenadas na VM                                                                                                                                                                                                                                                                                                    | `files` + adaptador de disco local                                                  |
| L10 | Moderação do fórum                 | Denúncias, ações de moderação e restrições                                                                                                                                                                                                                                                                           | `message_reports`, `moderation_actions`, `user_course_restrictions`                 |
| L11 | Backup                             | Nenhum na v2                                                                                                                                                                                                                                                                                                         | Risco aceito (ver Lacunas)                                                          |
| D11 | Gerenciador de pacotes             | pnpm + Turborepo                                                                                                                                                                                                                                                                                                     | O front sai do bun: lockfile único, Dockerfile e CI com pnpm                        |
| D12 | Vagas por curso                    | Uma turma atende vários cursos; reserved\_seats é a reserva de um curso dentro do total                                                                                                                                                                                                                              | class\_section\_offers, uma linha por turma e curso                                 |
| D13 | Agendas locais antigas             | Curso inferido no front; hotfix passa a gravar os slugs                                                                                                                                                                                                                                                              | Importação sempre com course\_id explícito (seção Turmas e agendas)                 |
| D14 | Branch feat/users                  | Descartada por completo                                                                                                                                                                                                                                                                                              | Nada dela é reaproveitado; a v2 parte do master atual                               |
| D15 | Leitura do fórum                   | Só para usuários logados                                                                                                                                                                                                                                                                                             | Matriz de permissões                                                                |
| D16 | Notificações                       | Só dentro da plataforma, já na v2                                                                                                                                                                                                                                                                                    | Seção Notificações                                                                  |
| D17 | Documentação da API                | Swagger em todas as rotas, com CI barrando rota sem documentação                                                                                                                                                                                                                                                     | Seção Monorepo e arquitetura                                                        |
| D18 | Links do curso                     | Página própria no estilo Linktree, com tema, seções, destaque, agendamento e cliques anônimos                                                                                                                                                                                                                        | Seção Página de links; course\_links substituída por 6 tabelas                      |
| D19 | Lint                               | oxlint no lugar do ESLint, com lint type-aware e plugin JS para as regras do React Compiler                                                                                                                                                                                                                          | Seção Monorepo e arquitetura; Prettier segue só como formatador                     |
| D20 | Branch de produção                 | `master` continua como produção; `main` é apagada                                                                                                                                                                                                                                                                    | Substitui a escolha de `main` no Git flow; CI em PRs para `develop` e `master`      |
| D21 | Sintaxe dos requisitos             | `E` tem precedência sobre `OU`; texto vazio é "sem requisito"; a árvore é guardada normalizada (grupos achatados, sem repetição)                                                                                                                                                                                     | Seção Catálogo acadêmico; `parseRequirement` no `academic-core`                     |
| D22 | Equivalências                      | Diretas, só na direção gravada (não simétricas) e sem encadear (não transitivas); uma equivalência com `E` exige todas as disciplinas                                                                                                                                                                                | Seção Catálogo acadêmico; `isSubjectCompleted`                                      |
| D23 | Termo letivo                       | Só os períodos `.1` e `.2`; depois de `2026.2` vem `2027.1`                                                                                                                                                                                                                                                          | `academic_terms.period` em 1 ou 2                                                   |
| D24 | Dia da semana                      | ISO 8601: 1 = segunda … 7 = domingo                                                                                                                                                                                                                                                                                  | `class_section_slots.weekday`                                                       |
| D25 | Nota                               | 0 a 10 com duas casas, opcional em `APROVADO`, `REPROVADO` e `APROVEITADA`, sem faixa mínima ou máxima por situação                                                                                                                                                                                                  | Regras do histórico                                                                 |
| D26 | Histórico passado                  | Registros podem nascer com situação final em qualquer semestre até o vigente; `CURSANDO` só no vigente; nada em semestre futuro                                                                                                                                                                                      | Regras do histórico                                                                 |
| D27 | Cálculo do progresso               | Natureza `MANDATORY` ou `OPTATIVE`; cumprida por equivalência usa a carga da EC e a equivalente não conta de novo; subvertente conta para a mãe; total = disciplinas + complementares (até o exigido) + atividades de extensão                                                                                       | Seção Progresso de integralização                                                   |
| D28 | Co-requisitos                      | Não bloqueiam a lista de disciplinas liberadas; contam como satisfeitos se cumpridos ou em `CURSANDO`, e os que faltam são listados para cursar junto                                                                                                                                                                | `findAvailableSubjects`                                                             |
| D29 | Tipos de domínio                   | `RequirementExpr`, `RecordStatus`, `TimeSlot` e afins são definidos no `academic-core`; o `contracts` depende dele e tipa os schemas Zod contra esses tipos                                                                                                                                                          | Seção Monorepo e arquitetura                                                        |
| D30 | Tipo de componente                 | `subjects.type` usa os dez tipos que a extensão atual reconhece no SIGAA, com nomes em inglês; TCC, estágio e afins são tipo, não natureza                                                                                                                                                                           | Seção Catálogo acadêmico; `subjectTypeSchema`                                       |
| D31 | Temas da página de links           | O destaque de CIANO, LARANJA e VERDE passa para o tom 700 e cada tema ganha `onAccent`, para o botão preenchido passar no AA                                                                                                                                                                                         | `LINK_PAGE_THEMES` e design-system.md; difere do mockup `Links-Editor`              |
| D32 | Formato da API                     | JSON em camelCase, datas ISO 8601 com fuso; Problem Details com `type` = `https://flow.ufc.br/problems/<código>` e validação em 400 `VALIDATION_FAILED` com `errors[]`                                                                                                                                               | Seção Monorepo e arquitetura; `packages/contracts`                                  |
| D33 | `CurriculumImportV1`               | Objetos estritos, requisitos já normalizados, coerência de vertentes checada no schema e ciclos de pré-requisito só ao publicar; fixture com a EC 2006.2 de Eng. de Computação, a única disponível                                                                                                                   | Seção Importação e edição de grades; substitui a fixture 2025.1 do roadmap          |
| D34 | Código do curso no SIGAA           | Catálogo `sigaa_courses` da lista pública do SIGAA, atualizado por tarefa agendada; a extensão usa a escolha manual, o curso selecionado na tela de busca ou o reconhecimento pelo cabeçalho (`matchSigaaCourse`)                                                                                                    | Seção Catálogo acadêmico; `course.recognition` no `CurriculumImportV1`              |
| D35 | Código e vigor da EC               | O código da EC (`code`, dá o slug) e o período de entrada em vigor (`effective_term`) são campos separados; `curricula.sigaa_id` guarda o id da EC no SIGAA                                                                                                                                                          | Substitui `curricula.period`                                                        |
| D36 | Tipo de componente                 | Acrescenta `INTEGRATIVE_ACTIVITY` (atividades integradoras de formação) aos tipos da D30                                                                                                                                                                                                                             | `subjects.type`                                                                     |
| D37 | Ênfases e grupos                   | Ênfases com código, CH obrigatória e optativa mínima; grupos com mínimos e máximos de horas e de componentes; EC com mínimo e máximo de ênfases                                                                                                                                                                      | `branches`, `curricula.min_emphases`/`max_emphases`                                 |
| D38 | Componentes anuais                 | `subjects.duration_terms` (1 ou 2) para "2 períodos letivos (Anual)"                                                                                                                                                                                                                                                 | Seção Catálogo acadêmico                                                            |
| D39 | Semestre das optativas             | Vai como o SIGAA mostra; quem exibe decide (substitui o "semestre nulo nas optativas" da D33)                                                                                                                                                                                                                        | `CurriculumImportV1`                                                                |
| D40 | Atividade acadêmica específica     | `complementary_activity_hours` vira `specific_activity_hours`; a exigência de complementares é a carga do componente `COMPLEMENTARY_ACTIVITY`                                                                                                                                                                        | Progresso revisto na fase 9 (Lacunas)                                               |
| D41 | Login e envio na extensão          | Ficam atrás de `PLASMO_PUBLIC_FLOW_SYNC`, desligada por padrão, até a API existir (login na fase 4, envio na fase 5); na fase 3 só o download do JSON funciona                                                                                                                                                       | Roadmap fases 3 a 5                                                                 |
| D42 | Runtime da API                     | NestJS 12 em ESM sobre Express, com `@Inject(token)` explícito em todo construtor (sem `emitDecoratorMetadata`, que o tsx, o esbuild e o Vitest não geram). Dev com tsx; produção num bundle do tsup que embute os pacotes `@ufc-flow/*`                                                                             | Monorepo e arquitetura › Estrutura da API                                           |
| D43 | Tokens                             | Access token JWT HS256 (`jose`, emissor `ufc-flow`, 15 min); refresh token opaco de 32 bytes, guardado só como sha256. O web leva o refresh token em cookie httpOnly; a extensão o manda no corpo                                                                                                                    | Usuários › Autenticação                                                             |
| D44 | Senha                              | De 8 a 128 caracteres, sem regra de composição; argon2id com os parâmetros da OWASP                                                                                                                                                                                                                                  | `passwordSchema` no `contracts`                                                     |
| D45 | Limite de tentativas               | Global de 120/min por IP; login 5/min, cadastro 10/h, refresh 30/min e redefinição 10/min, contados por IP + e-mail quando há e-mail no corpo                                                                                                                                                                        | Usuários › Autenticação                                                             |
| D46 | Versão dos consentimentos          | Termos e Política de privacidade começam na versão `0.1`, com texto preliminar em `/termos` e `/privacidade`. O texto final, na fase 13, sobe a versão e pede novo aceite                                                                                                                                            | LGPD; roadmap fase 13                                                               |
| D47 | Catálogo mínimo na fase 4          | `campuses` e `courses` nascem na fase 4, porque a moderação é por curso, com seed dos 6 cursos do `courses.ts` (`seed:courses`). A FK `courses.sigaa_id → sigaa_courses` e o resto do catálogo ficam para a fase 5                                                                                                   | Catálogo acadêmico; roadmap fase 5                                                  |
| D48 | Web como BFF                       | Cookies `ufcflow_access` e `ufcflow_refresh` (httpOnly, `SameSite=Lax`, `Secure` em produção). Login, cadastro, saída e redefinição são server actions; o `proxy.ts` renova a sessão antes da página (menos em prefetch); o menu do header lê `GET /api/auth/session`. Nenhum token chega ao JavaScript do navegador | Usuários › Autenticação                                                             |
| D49 | Testes da API                      | `test` roda os unitários sem Docker (com cobertura de 90% em domínio e aplicação); `test:integration` roda repositórios e e2e contra Postgres no Testcontainers. Os dois rodam no CI                                                                                                                                 | Monorepo e arquitetura › Testes                                                     |
| D50 | Sessão da extensão                 | Fica em `chrome.storage.local`, com a permissão `storage` e a URL da API (`PLASMO_PUBLIC_FLOW_API_URL`, em `.env.development` e `.env.production` versionados) nas `host_permissions`. O login funciona com a flag da D41 ligada; o envio continua na fase 5                                                         | Monorepo e arquitetura › Extensão                                                   |
| D51 | Web sem API                        | Sem `API_URL` configurada, o web continua lendo o `courses.ts`; com ela, lê o catálogo da API. O fallback sai na fase 13, junto com o deploy da API                                                                                                                                                                  | Roadmap fases 5 e 13                                                                |
| D52 | Importação de curso que não existe | Qualquer moderador ou admin envia; a importação fica pendente (`COURSE_MISSING`) e vira rascunho quando um admin cria o curso. Quem enviou não ganha moderação do curso novo. Para curso que existe, só o moderador dele ou um admin                                                                                 | Importação e edição de grades                                                       |
| D53 | Reimportação                       | Vale também sobre EC publicada: a API acha a EC pelo código do SIGAA, mostra o diff e, ao aplicar, muda a própria EC pelas mesmas regras da edição manual, com auditoria. O slug da EC não muda; vertentes do Flow (`SLOPE`) que o arquivo não traz ficam, com os vínculos                                           | Importação e edição de grades                                                       |
| D54 | Equivalências na importação        | Importação de admin aplica direto. A de moderador deixa um ponto `EQUIVALENCES_SUGGESTED` que só um admin resolve (aplicar ou ignorar); ele não barra a publicação. Resolve a lacuna da fase 5                                                                                                                       | Importação e edição de grades                                                       |
| D55 | Pontos para revisar                | Ficam em `curriculum_imports.conflicts` da última importação aplicada: nome divergente (manter catálogo ou usar o do SIGAA), carga divergente (idem, sob a trava da disciplina global), requisito fora do catálogo (ciente) e equivalência sugerida. Os três primeiros barram a publicação enquanto abertos          | Importação e edição de grades                                                       |
| D56 | Rotas do catálogo                  | Leitura pública em `/v1/courses/...` e `/v1/sigaa-courses`, com `Cache-Control` de 60 s e ETag; gestão de ECs em `/v1/manage/...` (moderador do curso ou admin); cursos, catálogo do SIGAA e disciplina global em `/v1/admin/...`; ingestão em `/v1/ingestion/curriculum-imports`                                    | Catálogo acadêmico; Importação                                                      |
| D57 | Leitura do catálogo do SIGAA       | Tarefa semanal (segunda, 4h de Fortaleza, `@nestjs/schedule`) e botão do admin. Lista vazia ou erro não apaga nada; curso que some ganha `removed_at`. O campus de um curso novo sai da cidade (`sobral`, "Campus da UFC em Sobral"; "UFC em Fortaleza" para os centros)                                             | Catálogo acadêmico                                                                  |
| D58 | Disciplina global e rascunhos      | Só admin edita disciplina global e equivalências direto; moderador corrige nome e carga pelos pontos para revisar. Rascunho de EC pode ser descartado; EC publicada, não                                                                                                                                             | Catálogo acadêmico                                                                  |
| D59 | Slug da EC                         | Nasce do código (`2006.2` → `2006-2`) e é editável. O seed mantém os slugs do `courses.ts`, inclusive `/ciencias-economicas/2005-1` (EC 2025.1), para as URLs não mudarem                                                                                                                                            | Catálogo acadêmico                                                                  |
| D60 | Envio pela extensão                | Um service worker (`background.ts`) faz as chamadas à API: o painel roda na página do SIGAA e lá o CORS da página barra. O envio guarda os envios recentes em `chrome.storage.local`, e o popup atualiza a situação dos pendentes ao abrir. A flag da D41 fica ligada nos `.env`                                     | Monorepo e arquitetura › Extensão                                                   |
| D61 | Catálogo do SIGAA na extensão      | Vem de `GET /v1/sigaa-courses`, com cache de um dia no service worker; sem API, fica o último guardado e, sem nenhum, o JSON embutido. Antes de enviar, a aba Revisar compara os nomes com `GET /v1/subjects?codes=` e avisa os que viram ponto para revisar                                                         | Monorepo e arquitetura › Extensão                                                   |
| D62 | Telas do editor no web             | O envio leva a `/admin/estruturas/{id}` (EC) e a `/admin/importacoes/{id}` (diff da reimportação e importação pendente); o PR 5.3 implementa essas rotas                                                                                                                                                             | Roadmap fase 5                                                                      |

## Monorepo e arquitetura

Um único repositório com três apps e pacotes compartilhados. As regras acadêmicas puras (requisitos, conflito de horário, progresso) ficam num pacote sem framework, usado pelo web e pela API. Isso elimina os tipos hoje copiados à mão em três repositórios.

```
ufc-flow/
├─ apps/
│  ├─ web/            Next 16 — o atual ufc-flow-front + área de edição de grades (ex-course-maker)
│  ├─ api/            NestJS + Drizzle + PostgreSQL
│  └─ extension/      Plasmo — o atual sigaa-classes-scraping
├─ packages/
│  ├─ contracts/      schemas Zod: DTOs da API, formato de importação de EC (v1), enums; depende do academic-core (D29)
│  └─ academic-core/  regras puras: expressão de requisitos, termo "2026.1", conflito de horário, progresso
├─ docker/            compose de desenvolvimento (Postgres)
├─ .oxlintrc.json     lint de todo o monorepo
├─ .prettierrc        formatação de todo o monorepo
├─ tsconfig.base.json base dos tsconfig dos pacotes
├─ turbo.json
└─ pnpm-workspace.yaml
```

**Gerenciador de pacotes.** Decidido: pnpm + Turborepo. O Plasmo e o NestJS são documentados e testados com npm/pnpm. O front sai do bun: `bun.lock` e `package-lock.json` dão lugar a um único `pnpm-lock.yaml` na raiz, e o Dockerfile e o CI do web passam a usar pnpm.

**Lint.** Decidido: o oxlint substitui o ESLint em todo o monorepo. Uma configuração na raiz (`.oxlintrc.json`) liga os plugins nativos `typescript`, `react`, `nextjs`, `import` e `jsx-a11y`, com `overrides` por pasta para o que vale só no web ou na extensão. O lint type-aware roda no CI com `oxlint-tsgolint`, que cobre 59 das 61 regras type-aware do typescript-eslint ([estável desde julho de 2026](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)). As regras do React Compiler, como `set-state-in-effect`, entram pelo `eslint-plugin-react-hooks` carregado como plugin JS, que passa em 100% dos testes desse plugin ([plugins JS, alpha](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha)). A migração parte de `pnpm dlx @oxlint/migrate`, que lê o `eslint.config.mjs` e lista as regras sem equivalente. Saem `eslint`, `eslint-config-next`, `eslint-config-prettier` e `eslint-plugin-prettier`. O Prettier continua só como formatador, checado no CI com `prettier --check`; o oxfmt fica para quando sair do beta.

Como ficou na fase 0:

- O nome `react-hooks` é reservado para as regras nativas do oxlint, então o plugin JS entra com o alias `react-hooks-js`. Comentários de supressão usam esse nome: `// oxlint-disable-next-line react-hooks-js/exhaustive-deps`.
- As regras nativas do React Compiler (`react/set-state-in-effect`, `react/purity`, etc.) ficam desligadas. Elas acusam mais do que o plugin oficial (por exemplo, `new Date()` no render como impuro), e o plugin JS reproduz exatamente o que o ESLint acusava.
- A categoria `correctness` fica ligada. As regras de `jsx-a11y` que ela trouxe e que o ESLint não tinha (`click-events-have-key-events`, `no-noninteractive-element-interactions`, `no-static-element-interactions`, `prefer-tag-over-role`) valem como erro. Em `apps/web/src/components/ui` (componentes do shadcn, regenerados pelo CLI), `prefer-tag-over-role` fica desligada: o `role="group"` do `Field` é ARIA válido.
- O tsgolint lê os tsconfig em TS 5.9 sem erro.
- Prettier e oxlint rodam a partir da raiz. As quebras de linha são LF em todo o repositório (`.gitattributes` e `endOfLine: "lf"`).

**Estrutura da API (hexagonal por módulo).** Cada módulo é um contexto delimitado com três camadas. O schema Drizzle de cada tabela mora no módulo dono dela; o `drizzle.config.ts` aponta para um glob.

```
apps/api/src/
├─ modules/
│  ├─ identity/          usuários, sessões, papéis, moderação, consentimentos
│  ├─ catalog/           cursos, ECs, disciplinas, vertentes, requisitos, equivalências
│  ├─ classes/           turmas, docentes, job de scraping
│  ├─ planning/          agendas
│  ├─ academic-record/   matrículas, histórico, horas complementares, progresso
│  ├─ evaluation/        avaliação de disciplinas
│  ├─ hub/               posts e links
│  ├─ forum/             mensagens, curtidas, menções, moderação
│  ├─ files/             upload e entrega de arquivos
│  └─ ingestion/         importação de ECs vindas da extensão
│     └─ <cada módulo>/
│        ├─ domain/          entidades, value objects, erros, portas (interfaces)
│        ├─ application/     casos de uso
│        └─ infrastructure/  controllers HTTP, repositórios Drizzle, mappers, *.schema.ts
├─ shared/               kernel: Result, DomainError, Clock, IdGenerator, paginação, guards, policies
└─ database/             cliente Drizzle, migrations
```

**Onde aplicar o rigor.** Hexagonal completo em `catalog` (publicação e edição de EC), `academic-record`, `planning`, `forum` e `identity`. CRUD simples (links do curso, critérios de avaliação) usa caso de uso + repositório direto, sem entidade rica.

**Documentação e teste das rotas (Swagger).** Toda rota da API é documentada em OpenAPI e testável pelo Swagger UI; uma rota sem documentação quebra o CI.

- `@nestjs/swagger` gera o documento OpenAPI a partir dos controllers. Swagger UI em `/docs`, JSON em `/docs/openapi.json`.
- Os schemas vêm dos mesmos contratos Zod de `packages/contracts`, convertidos com `z.toJSONSchema` do Zod 4 (ou `nestjs-zod`, se a versão escolhida suportar Zod 4). Assim validação e documentação não divergem.
- Cada módulo vira uma tag (`@ApiTags`). Cada rota tem resumo em português (`@ApiOperation`), exemplos de corpo e todas as respostas, inclusive as de erro.
- Erros seguem um formato único (Problem Details: `type`, `title`, `status`, `detail`, `code`), documentado uma vez e referenciado em todas as rotas. Paginação por cursor também tem schema próprio.
- Como ficou na fase 2 (D32):
  - Os schemas com nome (`.meta({ id })`) viram componentes do OpenAPI 3.0 com `toOpenApiComponents()`, e as referências apontam para `#/components/schemas/<id>`. Refinamentos, como a forma normalizada dos requisitos, só existem no Zod.
  - O `type` do Problem Details é `https://flow.ufc.br/problems/<código em kebab-case>`, e `instance` é opcional.
  - Falha de validação responde 400 com `code: VALIDATION_FAILED` e `errors[]` (`path`, `message`, `code`), gerado por `validationProblem(error)`. O código de cada erro vem de `params.code` da regra ou do tipo da issue (`VALIDATION_TOO_SMALL`).
  - A paginação recebe `?cursor=&limit=`, com limite de 1 a 100 e padrão 20, e responde `{ items, nextCursor }`, com `nextCursor` nulo na última página.
  - JSON em camelCase, inclusive em `attributes`. Datas em ISO 8601 com fuso.
- Botão "Authorize" com Bearer (`addBearerAuth`): faz-se login em `/auth/sign-in` no próprio Swagger e testam-se as rotas protegidas com o token.
- Rotas versionadas por URI (`/v1/...`), com um documento por versão.
- Em desenvolvimento, `/docs` é aberto. Em produção, fica atrás de Basic Auth configurada por variável de ambiente (`SWAGGER_USER`, `SWAGGER_PASSWORD`), ou desligado com `SWAGGER_ENABLED=false`.
- CI: um teste percorre o documento gerado e falha se alguma operação não tiver resumo ou respostas documentadas. O `openapi.json` gerado é versionado no repositório; se mudar sem ser commitado, o CI falha, e mudanças de contrato aparecem no diff do PR.

**Testes.**

- Domínio e `academic-core`: unitários puros (Vitest).
- Casos de uso: repositórios em memória que implementam as portas.
- Repositórios Drizzle: integração com Postgres via Testcontainers.
- HTTP: e2e com supertest sobre o app Nest.
- CI: lint, typecheck, testes e cobertura mínima como gate, só nos pacotes afetados (Turborepo).

**Git flow.** `master` = produção, `develop` = integração, `feature/*`, `release/*`, `hotfix/*` (D20). A branch `main`, que existia junto com `master` e estava desatualizada, foi apagada. O CI roda em PRs para `develop` e `master` e em push para `master`.

**Extensão (`apps/extension`).** Plasmo 0.90 com React 19, como o web. Como ficou na fase 3:

- **Tailwind 4:** o Parcel 2.9 do Plasmo não carrega o plugin PostCSS do Tailwind 4, então a CLI do Tailwind gera `src/styles/generated.css` antes do Plasmo (`pnpm css`).
- **Zod:** o Parcel 2.9 descarta o módulo que define o `z` do zod ao analisar pacotes com `"sideEffects": false`. O `scripts/bundle-zod.mjs` empacota o zod com o esbuild em `src/vendor/zod.js`, e o `alias` do `package.json` aponta o `zod` para ele. Vale também para o código do `contracts` dentro do bundle.
- **Shadow DOM:** o Chrome ignora `@property` dentro de Shadow DOM, então o content script repete os valores iniciais das variáveis do Tailwind (`withPropertyFallbacks`); sem isso, bordas e sombras somem. As fontes vão no documento do SIGAA, porque `@font-face` não funciona dentro de Shadow DOM.
- **Assets:** ficam em `apps/extension/assets` (o Plasmo procura o ícone lá), e o código os importa por caminho relativo.
- **Permissões:** `host_permissions` para `https://si3.ufc.br/*` e para a URL da API do Flow; `storage` para a sessão (fase 4, D50).
- **Envio (fase 5, D60 a D62):** o painel pede ao service worker, que usa o Bearer da sessão. O modal mostra rascunho criado, curso pendente ou diferenças a conferir, e o popup lista os três últimos envios. Até a fase 7 não há aviso `IMPORT_PENDING`: o modal de curso pendente diz que a importação aparece para os administradores em Importações.

**Execução na VM.** Três containers no Coolify: `web`, `api`, `postgres`. Sem Redis: jobs agendados via `@nestjs/schedule`, possível porque a API roda em instância única. Uploads num volume Docker montado na API.

## Usuários, papéis e permissões

"Aluno" não é um papel gravado: é quem tem uma matrícula ativa num curso. Admin é um papel global. Moderador é sempre escopado a um curso e nasce de uma solicitação aprovada por um admin.

```
users(id, name, email UQ (minúsculo), password_hash (argon2id), email_verified_at NULL,
      avatar_file_id NULL → files, status[ACTIVE|SUSPENDED], created_at, updated_at)
user_roles(user_id, role[ADMIN], granted_by → users, granted_at)            PK(user_id, role)
course_moderators(id, user_id, course_id, request_id → moderator_requests,
      granted_by, granted_at, revoked_by NULL, revoked_at NULL)
      UQ parcial (user_id, course_id) WHERE revoked_at IS NULL
moderator_requests(id, user_id, course_id, justification, status[PENDING|APPROVED|REJECTED|CANCELED],
      reviewed_by NULL, reviewed_at NULL, review_note NULL, created_at)
      UQ parcial (user_id, course_id) WHERE status = 'PENDING'
sessions(id, user_id, family_id, refresh_token_hash, user_agent, ip, created_at,
      expires_at, revoked_at NULL, replaced_by_id NULL)
password_reset_tokens(id, user_id, token_hash, created_by → users, expires_at, used_at NULL)
user_preferences(user_id, key, value JSONB, updated_at)                     PK(user_id, key)
user_consents(id, user_id, document[TERMS|PRIVACY], version, accepted_at)
audit_logs(id, actor_id NULL, module, entity, entity_id, action, changes JSONB, created_at)
```

**Fluxo de moderação.** O usuário logado pede moderação de um curso com uma justificativa. Um admin aprova ou rejeita, com nota opcional. A aprovação cria a linha em `course_moderators`; a revogação preenche `revoked_at`, preservando o histórico.

**Matriz de permissões**

| Ação                                                           | Anônimo | Logado | Aluno do curso                  | Moderador do curso | Admin |
| -------------------------------------------------------------- | ------- | ------ | ------------------------------- | ------------------ | ----- |
| Ver grade, turmas, hub, médias de avaliação                    | sim     | sim    | sim                             | sim                | sim   |
| Agenda local (IndexedDB)                                       | sim     | sim    | sim                             | sim                | sim   |
| Agenda sincronizada, preferências                              | não     | sim    | sim                             | sim                | sim   |
| Ler o fórum                                                    | não     | sim    | sim                             | sim                | sim   |
| Postar, responder e curtir no fórum                            | não     | não    | sim                             | sim                | sim   |
| Histórico e horas complementares (próprios)                    | não     | não    | sim                             | —                  | —     |
| Avaliar disciplina                                             | não     | não    | se tiver concluído a disciplina | idem               | idem  |
| Solicitar moderação                                            | não     | sim    | sim                             | —                  | —     |
| Criar, editar e apagar posts do hub e editar a página de links | não     | não    | não                             | sim                | sim   |
| Moderar o fórum                                                | não     | não    | não                             | sim                | sim   |
| Importar, editar e publicar EC; marcar vigente                 | não     | não    | não                             | sim                | sim   |
| Criar curso, aprovar moderadores, gerir critérios e usuários   | não     | não    | não                             | não                | sim   |

"Aluno do curso" = matrícula com `status = ACTIVE` naquele curso. As regras moram numa porta `AccessPolicy` do domínio (ex.: `canManageHub(user, courseId)`), testada sem banco.

**Autenticação.** O web funciona como BFF: guarda access token (15 min) e refresh token (30 dias) em cookies httpOnly e chama a API no servidor. A extensão usa Bearer. Cada refresh gira o token; reutilizar um token já girado revoca a família inteira (`family_id`). Senhas com argon2id e limite de tentativas via `@nestjs/throttler`.

Como ficou na fase 4 (D43 a D48):

- O access token é um JWT HS256 assinado com `JWT_SECRET`; o refresh token é opaco e o banco guarda só o hash. Sair revoga a família; redefinir a senha revoga todas as sessões do usuário.
- Rotas: `POST /v1/auth/sign-up`, `sign-in`, `refresh`, `sign-out` e `password-reset`; `GET /v1/me` e `/v1/me/moderator-requests`; `POST /v1/moderator-requests` com `approve`, `reject` e `cancel`; `GET /v1/moderator-requests` (admin); `POST /v1/admin/users/{userId}/password-reset-links` (admin); `GET /v1/courses` e `GET /v1/health`.
- O link de redefinição aponta para `${WEB_URL}/redefinir-senha?token=…`. Gerar o link, aprovar e rejeitar pedidos e conceder papel gravam em `audit_logs`.
- O web repassa à API o IP do cliente (`x-forwarded-for`) e o navegador, que entram em `sessions` e no limite de tentativas. A API confia em um proxy (`trust proxy 1`).

**Sem SMTP, recuperação de senha é manual.** Um admin gera um link de uso único (`password_reset_tokens`, validade de 24 h) e o entrega ao usuário por fora. Quando houver SMTP, o mesmo fluxo passa a mandar o link por e-mail.

**LGPD**

- Cadastro exige aceite de Termos e Política de Privacidade; cada aceite grava versão e data em `user_consents`.
- `GET /me/export` devolve em JSON todos os dados do usuário (portabilidade).
- Exclusão de conta apaga de fato: matrículas, histórico, horas, agendas, preferências, sessões, curtidas e arquivos pessoais (avatar, certificados).
- O que pertence à comunidade é anonimizado: mensagens do fórum têm o conteúdo trocado por "mensagem removida" e o autor zerado, mantendo a thread; avaliações perdem o `user_id` e continuam nas médias; posts do hub ficam com autor nulo.
- As FKs de autoria usam `ON DELETE SET NULL`; as de dados pessoais usam `ON DELETE CASCADE`.
- `audit_logs` registra quem mudou o quê em ECs, moderação e papéis.

## Catálogo acadêmico

A disciplina é global e identificada pelo código do SIGAA. O que muda de uma EC para outra (semestre ideal, natureza, requisitos, vertentes) fica na tabela pivô `curriculum_subjects`. Nos dados atuais isso se confirma: nome e carga horária batem entre ECs, mas o semestre difere em 64 códigos e a natureza em 37.

```
campuses(id, slug UQ, name, city, state)
sigaa_courses(sigaa_id PK, name, city, modality[IN_PERSON|DISTANCE] NULL, unit_acronym NULL, unit_name NULL,
      first_seen_at, last_seen_at, removed_at NULL)            catálogo da lista pública do SIGAA (D34, D57)
courses(id, sigaa_id UQ → sigaa_courses, slug UQ, name, icon, color, campus_id, is_active, created_at, updated_at)
curricula(id, course_id, code '2026.1', effective_term '2025.1', sigaa_id NULL, slug,
      matrix_name, unit_name NULL, status[DRAFT|PUBLISHED], is_current, needs_reimport,
      min_total_hours, max_total_hours NULL, mandatory_hours, optative_hours, extension_hours,
      specific_activity_hours, max_free_optative_hours, min_emphases NULL, max_emphases NULL,
      min_periods, avg_periods, max_periods, period_min_hours, period_avg_hours, period_max_hours,
      published_at NULL, published_by NULL, created_at, updated_at)
      UQ(course_id, slug) · UQ parcial (course_id) WHERE is_current
      CHECK (NOT is_current OR status = 'PUBLISHED')
subjects(id, code UQ, name, slug, search_name,
      type[DISCIPLINE|COMPLEMENTARY_ACTIVITY|FINAL_PROJECT|INTERNSHIP|EXTENSION_UNIT|MODULE|ADVANCED_TOPIC|SEMINAR|TUTORING|INTEGRATIVE_ACTIVITY|OTHER],
      workload_hours, theory_hours, lab_hours, ead_hours, extension_hours, credits,
      duration_terms (1|2), created_at, updated_at)  GIN trigram em search_name e code
curriculum_subjects(id, curriculum_id, subject_id, semester NULL, semester_inferred, nature,
      prerequisite_expr JSONB NULL, corequisite_expr JSONB NULL, created_at)
      UQ(curriculum_id, subject_id)
curriculum_subject_requirements(curriculum_subject_id, kind[PRE|CO], required_code, required_subject_id NULL)
branches(id, curriculum_id, parent_id NULL, type[SLOPE|EMPHASIS|SPECIFIC_GROUP], name,
      description, sigaa_code NULL, color, mandatory_hours NULL, min_hours NULL, max_hours NULL,
      min_components NULL, max_components NULL, position)
curriculum_subject_branches(curriculum_subject_id, branch_id, nature)   PK(curriculum_subject_id, branch_id)
subject_equivalences(subject_id PK, expr JSONB)
subject_equivalence_codes(subject_id, equivalent_code, equivalent_subject_id NULL)
```

**Requisitos como expressão.** No SIGAA, pré-requisitos e equivalências são expressões com `E`/`OU`. A extensão hoje guarda só a lista de códigos, transformando todo `OU` em `E`. A expressão passa a ser uma árvore, definida em `packages/academic-core` e usada igual no web e na API:

```ts
type RequirementExpr =
  | { kind: 'subject'; code: string }
  | { kind: 'and'; items: RequirementExpr[] }
  | { kind: 'or'; items: RequirementExpr[] }
```

- A árvore referencia **códigos**, não IDs: o SIGAA cita disciplinas que podem não estar importadas (ex.: `CEC0058` em equivalências de Cálculo I).
- As tabelas `*_requirements` e `*_equivalence_codes` são derivadas da árvore a cada gravação. Servem para o grafo do React Flow e para a consulta "o que esta disciplina desbloqueia".
- Uma disciplina está cumprida se o aluno tem registro `APROVADO` ou `APROVEITADA` nela ou numa equivalente (equivalência global, decisão D5).
- `E` tem precedência sobre `OU`, e texto vazio significa sem requisito (D21). As equivalências valem só na direção gravada e não se encadeiam: se A equivale a B e B a C, A não equivale a C (D22).

**Vertentes.** O tipo (`SLOPE`, `EMPHASIS`, `SPECIFIC_GROUP`), a hierarquia (`parent_id`) e os mínimos (`min_hours`, `min_components`), que já existem nos tipos do front, entram na modelagem. A pivô `curriculum_subject_branches` com `nature` substitui os campos duplicados `branch: string[]` e `branchRelations`.

**Ênfases e grupos do SIGAA (D37).**

- Ênfase:
  - código próprio (`sigaa_code`, ex.: `2023.1E2`);
  - CH obrigatória (`mandatory_hours`) e CH optativa mínima (`min_hours`);
  - disciplinas "Obrigatória (Ênfase)" ou "Optativa (Ênfase)", que viram a `nature` do vínculo. Uma disciplina optativa na EC pode ser obrigatória dentro da ênfase, como os estágios da Psicologia.
- Grupo de componentes específicos:
  - CH mínima e máxima (`min_hours`, `max_hours`);
  - quantidade mínima e máxima de componentes (`min_components`, `max_components`). Medicina usa o máximo: dois internatos alternativos com exatamente 2 ou 4 componentes.
  - Pode ficar dentro de uma ênfase, e então vira filho dela (`parent_id`).
- A EC diz quantas ênfases são exigidas e permitidas ("Exigido (1), Permitido (4)"): `min_emphases` e `max_emphases`, nulos em "Sem exigências ou restrições".
- Vertentes do tipo `SLOPE` não aparecem no SIGAA: são cadastradas no Flow.

**Tipo de componente (D30).** `subjects.type` usa os tipos que a extensão atual reconhece no SIGAA, com nome em inglês. A natureza na EC continua só `MANDATORY` ou `OPTATIVE`.

| SIGAA                                   | `type`                   |
| --------------------------------------- | ------------------------ |
| Disciplina                              | `DISCIPLINE`             |
| Atividade complementar                  | `COMPLEMENTARY_ACTIVITY` |
| Trabalho de conclusão de curso          | `FINAL_PROJECT`          |
| Estágio                                 | `INTERNSHIP`             |
| Unidade curricular especial de extensão | `EXTENSION_UNIT`         |
| Módulo                                  | `MODULE`                 |
| Tópico avançado                         | `ADVANCED_TOPIC`         |
| Seminário                               | `SEMINAR`                |
| Tutoria                                 | `TUTORING`               |
| Atividades integradoras de formação     | `INTEGRATIVE_ACTIVITY`   |
| Qualquer outro                          | `OTHER`                  |

`INTEGRATIVE_ACTIVITY` entrou na fase 3 (D36), ao analisar 11 ECs reais (2 componentes na Música). Componentes anuais ("2 períodos letivos (Anual)") têm `duration_terms = 2` (D38).

**Código do curso no SIGAA (D34).** A página da estrutura curricular não traz o código do curso; só a tela de busca o tem, no select de cursos. A v2 resolve assim:

- `sigaa_courses` guarda os cursos da lista pública do SIGAA (`public/curso/lista.jsf?nivel=G&aba=p-graduacao`, sem login): código, nome, cidade, modalidade e unidade. O nome do coordenador não é guardado. Uma tarefa agendada da API mantém a lista em dia, com execução manual pelo admin (fase 5). Criar um curso no Flow é escolher um curso desse catálogo.
- `matchSigaaCourse` (no `academic-core`) reconhece o curso pelo cabeçalho da estrutura: cidade, modalidade (da matriz), unidade de vinculação e o nome de curso mais longo que começa a matriz. Acerta os 11 cursos analisados, inclusive "MEDICINA - SOBRAL - SOBRAL" e "MATEMÁTICA - LICENCIATURA". Diurno e noturno do mesmo curso ficam ambíguos.
- A extensão usa, nesta ordem: a escolha manual do usuário; o curso selecionado na tela de busca, guardado no `sessionStorage` da aba (se o cabeçalho não apontar outro curso); e o reconhecimento. O `CurriculumImportV1` registra a origem em `course.recognition` (`SELECTED`, `MATCHED` ou `MANUAL`) e leva a matriz e a unidade como vieram, para a API conferir.

**Código e vigor da EC (D35).** O código da EC no SIGAA (`curricula.code`, que dá o slug) nem sempre é o período de entrada em vigor (`effective_term`): Arquitetura tem código 2023.1 e vigor 2024.1; Psicologia, 2026.1 e 2025.1. O id da EC no SIGAA (`curricula.sigaa_id`) vem do link do relatório na tela de busca, quando a extensão o captura.

**EC vigente.** `is_current` é marcada manualmente por moderador ou admin, porque a Pró-Reitoria de Graduação pode manter vigente uma EC que não é a mais recente. Marcar uma EC desmarca a anterior na mesma transação. Uma EC publicada e não vigente continua visível e válida para quem está matriculado nela.

**Ciclo de vida e edição.** Uma EC nasce `DRAFT` (importada ou criada à mão) e é totalmente editável. Ao publicar, ela fica visível. A partir da primeira matrícula que a referencia, valem as regras abaixo; antes disso, nada pode ser prejudicado e tudo continua editável. Fora das regras, só uma nova EC resolve.

| O quê                                           | Depois da 1ª matrícula vinculada   | Por quê                                        |
| ----------------------------------------------- | ---------------------------------- | ---------------------------------------------- |
| EC: período, slug, cargas horárias exigidas     | bloqueado                          | Mudam o cálculo de integralização e as URLs    |
| EC: `is_current`                                | livre                              | Decisão administrativa, não afeta registros    |
| Disciplina na EC: adicionar                     | livre                              | Não altera registros existentes                |
| Disciplina na EC: remover, trocar natureza      | bloqueado                          | Registros deixariam de contar para o progresso |
| Disciplina na EC: semestre ideal                | livre                              | É só sugestão de exibição                      |
| Disciplina na EC: pré e co-requisitos           | livre, com auditoria               | Corrige validações futuras, não registros      |
| Vertente: nome, descrição, cor                  | livre                              | Cosmético                                      |
| Vertente: criar                                 | livre                              | Não afeta registros                            |
| Vertente: remover, tipo, pai, mínimos           | bloqueado                          | Muda o cálculo por vertente                    |
| Disciplina ↔ vertente: adicionar                | livre                              | Só acrescenta                                  |
| Disciplina ↔ vertente: remover, trocar natureza | bloqueado                          | Muda o cálculo por vertente                    |
| Disciplina global: nome                         | livre                              | Correção de grafia                             |
| Disciplina global: código, cargas, créditos     | bloqueado se usada em EC publicada | Afetam progresso em todos os cursos            |
| Equivalências                                   | só admin, com auditoria            | São globais e afetam todos os cursos           |

Essas regras vivem no agregado `Curriculum` do domínio, com testes unitários para cada linha da tabela. Toda alteração em EC publicada grava em `audit_logs`.

## Turmas e agendas

O backend coleta as turmas no SIGAA por curso e semestre e as guarda com chave natural `(semestre, código da disciplina, código da turma)`. Assim os IDs sobrevivem às atualizações, e a agenda no banco pode referenciar a turma diretamente. Hoje cada `ClassSection` recebe um `randomUUID()` novo a cada scraping.

```
academic_terms(id, code '2026.1' UQ, year, period, starts_at, ends_at, is_current)
      UQ parcial WHERE is_current        -- substitui NEXT_PUBLIC_CURRENT_YEAR/SEMESTER
instructors(id, siape UQ, name, profile_url)
class_sections(id, term_id, subject_code, subject_id NULL, section_code,
      valid_from, valid_to, fingerprint, first_seen_at, last_seen_at, removed_at NULL, updated_at)
      UQ(term_id, subject_code, section_code)
class_section_slots(id, class_section_id, weekday 1..7 (ISO: 1 = segunda, D24), start_time, end_time)
class_section_instructors(class_section_id, instructor_id)        PK composta
class_section_offers(class_section_id, course_id, reserved_seats, last_seen_at)   PK composta
scrape_runs(id, course_id, term_id, trigger[SCHEDULED|MANUAL], status[RUNNING|SUCCESS|FAILED],
      started_at, finished_at NULL, sections_seen, sections_changed, error NULL)

schedules(id, user_id, course_id, term_id, name, position, created_at, updated_at)
schedule_items(schedule_id, class_section_id, subject_code, color, slots_fingerprint, added_at)
      PK(schedule_id, class_section_id) · UQ(schedule_id, subject_code)
```

**Coleta.**

- Um job roda a cada 6 horas para cada curso ativo no semestre vigente, e também no seguinte durante o período de matrícula. Moderadores e admins podem disparar manualmente.
- Os cursos são processados em sequência, com pausa entre eles, para não sobrecarregar o SIGAA.
- Cada turma é atualizada pela chave natural. `fingerprint` é um hash de horários e docentes e só muda quando algo relevante muda.
- Turma que some numa coleta bem-sucedida recebe `removed_at`, sem ser apagada, para não quebrar agendas.
- Uma turma pode atender vários cursos ao mesmo tempo, com parte das vagas reservada para cursos específicos. Por isso `reserved_seats` fica em `class_section_offers`, uma linha por curso: é a reserva daquele curso dentro do total da turma.

**Front.** `GET /terms/:term/courses/:course/sections` substitui a rota `/api/scrapping` do Next. O IndexedDB vira só cache offline dessa resposta.

**Agenda.** Uma agenda tem no máximo uma turma por disciplina e nenhum conflito de horário. As duas regras ficam no agregado `Schedule`, usando a função de conflito do `academic-core`.

- Se o `slots_fingerprint` do item difere do `fingerprint` atual da turma, o front avisa que o horário mudou.
- Se a turma tem `removed_at`, o front avisa que ela não está mais ofertada.

**Anônimo e logado.**

1. Sem login, a agenda continua no IndexedDB, como hoje.
2. Logado, o servidor é a fonte da verdade. TanStack Query faz atualização otimista e o IndexedDB serve de cache. Em conflito vale a última escrita (`updated_at`); o agregado é pequeno e gravado inteiro.
3. No primeiro login com agendas locais, o front oferece importá-las. `POST /me/schedules/import` recebe cada agenda com seu UUID local e itens `(termo, código, turma, cor)`. O servidor resolve cada item para `class_sections.id` e devolve os que não encontrou.
4. O UUID local vira o `id` da agenda no servidor, então reenviar a importação não duplica nada.

**Agendas locais antigas.** Hoje a agenda do IndexedDB guarda em `courseId` o id da EC (ex.: `2006.2`), e esse id se repete entre cursos: Eng. de Computação, Eng. Elétrica e Psicologia têm uma EC `2006.2`. Isso já é um bug na versão atual, porque agendas de um curso aparecem nos outros cursos com EC de mesmo id, e deixa a importação ambígua. Solução:

1. Hotfix no front atual, antes da v2: agendas novas gravam `courseSlug` e `curriculumSlug`, a listagem filtra pelos dois, e uma migração do IndexedDB corrige as antigas com a regra do passo 2.
2. Para cada agenda antiga, o curso é inferido no front: se um só curso tem EC com aquele id, é ele; se vários, vence o curso cujas disciplinas mais coincidem com os códigos das turmas da agenda; em empate ou agenda vazia, sugere o curso da matrícula atual e o usuário confirma no diálogo de importação.
3. A API recebe sempre o `course_id` explícito. A inferência fica no front, onde estão os dados antigos.

Antes disso, unificar os dois bancos IndexedDB do front (`UFCFlowDB` e `ufc-flow-indexeddb`). Feito na fase 0: tudo fica no `UFCFlowDB` v7, aberto por `apps/web/src/lib/ufc-flow-db.ts`.

## Vida acadêmica do aluno

Cada registro do histórico é uma tentativa: uma disciplina, num semestre, com uma situação. Reprovar, trancar ou suprimir encerra a tentativa e permite uma nova num semestre posterior; aprovar ou aproveitar encerra a disciplina de vez.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> CURSANDO: matrícula no semestre vigente
    [*] --> APROVEITADA: lançada direto
    CURSANDO --> APROVADO
    CURSANDO --> REPROVADO
    CURSANDO --> TRANCADA
    CURSANDO --> SUPRIMIDA
    APROVADO --> [*]: disciplina encerrada
    APROVEITADA --> [*]: disciplina encerrada
    REPROVADO --> [*]: nova tentativa permitida
    TRANCADA --> [*]: nova tentativa permitida
    SUPRIMIDA --> [*]: nova tentativa permitida
```

Só `CURSANDO` muda de situação; as demais são finais para aquela tentativa, e `APROVEITADA` é lançada direto.

```
student_enrollments(id, user_id, course_id, curriculum_id, registration_number,
      status[ACTIVE|TRANSFERRED|CONCLUDED|CANCELED], is_current, entry_term_id NULL,
      created_at, updated_at)
      UQ parcial (user_id) WHERE is_current
student_subject_records(id, enrollment_id, subject_id, term_id,
      status[CURSANDO|APROVADO|REPROVADO|TRANCADA|SUPRIMIDA|APROVEITADA],
      grade NUMERIC(4,2) NULL, source_record_id NULL, origin_note NULL, created_at, updated_at)
      UQ(enrollment_id, subject_id, term_id)
activity_categories(id, curriculum_id, kind[COMPLEMENTARY|EXTENSION], name, max_hours NULL, position)
student_activity_records(id, enrollment_id, kind[COMPLEMENTARY|EXTENSION], category_id NULL,
      title, description NULL, institution NULL, hours, started_on, ended_on NULL,
      certificate_file_id NULL, created_at, updated_at)
```

**Regras do histórico** (agregado `AcademicRecord`, uma instância por matrícula):

| Regra                                  | Detalhe                                                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Uma tentativa em aberto por disciplina | No máximo um `CURSANDO` por disciplina na matrícula                                                                                    |
| `CURSANDO` só no semestre vigente      | Ao fim do semestre, o front pede ao aluno para fechar a situação                                                                       |
| Fechamento                             | `CURSANDO` → `APROVADO`, `REPROVADO`, `TRANCADA` ou `SUPRIMIDA`                                                                        |
| Nova tentativa                         | Só se todas as anteriores forem `REPROVADO`, `TRANCADA` ou `SUPRIMIDA`, e num semestre posterior à última                              |
| Disciplina encerrada                   | Com `APROVADO` ou `APROVEITADA`, nenhuma nova tentativa é aceita                                                                       |
| `APROVEITADA`                          | Criada direto, sem passar por `CURSANDO`; pode apontar o registro de origem (`source_record_id`) ou descrever a origem (`origin_note`) |
| Nota                                   | Opcional em `APROVADO`, `REPROVADO` e `APROVEITADA` (0 a 10, duas casas); proibida nas demais                                          |
| Disciplina fora da EC                  | Aceita: conta como optativa livre, até `max_free_optative_hours`                                                                       |
| Histórico passado                      | Pode ser lançado direto com situação final, em qualquer semestre até o vigente (D26)                                                   |
| Semestre futuro                        | Nenhum registro em semestre posterior ao vigente                                                                                       |

**Troca de EC e transferência.**

- Migrar de EC dentro do mesmo curso só troca `curriculum_id` da matrícula. Os registros ficam, porque apontam para a disciplina global, e o progresso é recalculado com as equivalências. A troca vai para `audit_logs`.
- Transferência interna cria uma nova matrícula no novo curso, com novo número; a antiga vira `TRANSFERRED` e `is_current` passa para a nova. O aluno marca `APROVEITADA` no que for aproveitado, ligando ao registro de origem.

**Horas complementares e de extensão.** O aluno lança cada atividade com título, horas, período e, opcionalmente, o certificado (imagem ou PDF guardado em `files`). As categorias e seus tetos de horas são cadastrados por EC, por moderadores, conforme o regulamento do curso. As horas são declaradas pelo aluno; a validação oficial continua sendo da coordenação.

**Progresso de integralização.** É calculado sob demanda pelo `academic-core`, sem tabela própria:

- obrigatórias cumpridas vs `mandatory_hours`;
- optativas da EC mais livres (com teto) vs `optative_hours`;
- cada vertente vs seus `min_hours` e `min_components`;
- atividades complementares, somadas por categoria com teto, vs a carga do componente `COMPLEMENTARY_ACTIVITY` da EC (D40; o cálculo é revisto na fase 9);
- extensão (horas de extensão das disciplinas cumpridas mais atividades de extensão) vs `extension_hours`;
- total vs `min_total_hours`.

Uma disciplina conta como cumprida quando tem `APROVADO` ou `APROVEITADA`, nela ou numa equivalente.

Detalhes do cálculo (D27):

- A natureza na EC é `MANDATORY` ou `OPTATIVE`. TCC, estágio e afins entram como uma das duas, conforme a EC.
- Uma disciplina da EC cumprida por equivalência conta com a carga da EC, e a equivalente usada não conta de novo como livre.
- As disciplinas de uma subvertente (`parent_id`) contam também para a vertente-mãe.
- Atividades sem categoria não têm teto.
- O total soma as disciplinas contadas (obrigatórias e optativas, com o teto das livres), as complementares até o exigido e as atividades de extensão. As horas de extensão das disciplinas já estão na carga delas e não contam duas vezes.

**Disciplinas liberadas.** São as da EC ainda não cumpridas nem em `CURSANDO`, com o pré-requisito cumprido (`CURSANDO` não conta). O co-requisito não bloqueia: conta como satisfeito se cumprido ou em `CURSANDO`, e os que faltam aparecem para cursar junto (D28).

## Avaliação de disciplinas

Cada aluno dá notas de 1 a 5 a critérios fixos, sem texto livre. A plataforma só mostra médias e distribuição a partir de 5 avaliações por disciplina, e nunca revela quem avaliou.

```
evaluation_criteria(id, key UQ, label, description, low_label, high_label, is_active, position)
subject_evaluations(id, user_id NULL, subject_id, created_at, updated_at)
      UQ parcial (user_id, subject_id) WHERE user_id IS NOT NULL
subject_evaluation_scores(evaluation_id, criterion_id, score SMALLINT CHECK 1..5)   PK composta
```

- **Quem avalia:** quem tem registro `APROVADO` ou `REPROVADO` na disciplina, em qualquer matrícula. `TRANCADA`, `SUPRIMIDA` e `APROVEITADA` não habilitam, porque a disciplina não foi cursada até o fim na UFC.
- **Uma avaliação por pessoa e disciplina**, editável depois.
- **Rótulos nas pontas da escala** (`low_label`, `high_label`) evitam ambiguidade. Ex.: em "Carga de trabalho", 1 = leve e 5 = pesada; em "Contribuição para a formação", 1 = pouca e 5 = muita.
- **Global:** a avaliação é da disciplina, não da EC; Cálculo I acumula avaliações de todos os cursos.
- **Sem recorte por semestre** na exibição: em turmas pequenas, o semestre ajudaria a identificar quem avaliou. Por isso a tabela nem guarda o semestre.
- **Critérios** são geridos pelo admin. Sugestão inicial: contribuição para a formação, aplicação prática, carga de trabalho, dificuldade, organização da disciplina.
- **Agregados** são calculados na leitura: média, contagem e distribuição de 1 a 5 por critério. Se ficar lento, vira uma view materializada atualizada pelo job agendado.
- **Vínculo institucional:** exigir e-mail `@alu.ufc.br` está modelado como configuração (`EVALUATION_REQUIRE_INSTITUTIONAL_EMAIL`), desligada até haver SMTP para verificar o e-mail.

## Arquivos e imagens

Os arquivos ficam num volume Docker da VM montado no container da API, atrás de uma porta `FileStorage`. Hoje o adaptador é o disco local; trocar por MinIO ou S3 depois não toca no domínio.

```
files(id, owner_id NULL, course_id NULL,
      purpose[AVATAR|POST_COVER|POST_IMAGE|CERTIFICATE|LINK_PAGE_IMAGE|LINK_THUMBNAIL|LINK_FILE], visibility[PUBLIC|PRIVATE],
      storage_key, original_name, mime_type, size_bytes, width NULL, height NULL, sha256,
      status[PENDING|ATTACHED], created_at, attached_at NULL, deleted_at NULL)
```

| Finalidade        | Visibilidade        | Tipos aceitos | Usado em                                               |
| ----------------- | ------------------- | ------------- | ------------------------------------------------------ |
| `AVATAR`          | pública             | imagem        | `users.avatar_file_id`                                 |
| `POST_COVER`      | pública             | imagem        | `posts.cover_file_id`                                  |
| `POST_IMAGE`      | pública             | imagem        | `post_images` (imagens no corpo do post)               |
| `CERTIFICATE`     | privada (só o dono) | imagem ou PDF | `student_activity_records.certificate_file_id`         |
| LINK\_PAGE\_IMAGE | pública             | imagem        | course\_link\_pages.avatar\_file\_id e cover\_file\_id |
| LINK\_THUMBNAIL   | pública             | imagem        | course\_links.thumbnail\_file\_id                      |
| LINK\_FILE        | pública             | PDF           | course\_links.file\_id (links do tipo FILE)            |

**Upload.**

1. `POST /files` (multipart) com a finalidade. A API confere o tipo pelos bytes do arquivo, não pela extensão, e aplica o limite de tamanho da finalidade.
2. Imagens são reprocessadas com sharp: convertidas para WebP, reduzidas a no máximo 2000 px no lado maior, e os metadados EXIF (inclusive GPS) são descartados.
3. O arquivo nasce `PENDING` e vira `ATTACHED` quando a entidade que o usa é salva (post, perfil, atividade).
4. Um job diário apaga do disco os `PENDING` com mais de 24 h e os arquivos com `deleted_at`.

**Caminho no disco:** `/data/uploads/{finalidade}/{aaaa}/{mm}/{id}.{ext}`. O nome original nunca entra no caminho; fica só no banco.

**Entrega:** `GET /files/:id`. Públicos saem com cache longo (o conteúdo de um id nunca muda). Privados exigem sessão do dono.

## Hub do curso

Notícias, eventos, bolsas, projetos de extensão e editais ficam numa única tabela `posts`, com colunas comuns e um JSONB para o que é específico de cada tipo. Um post com `course_id` nulo é institucional e aparece no hub de todos os cursos; só admins o criam.

```
posts(id, course_id NULL, author_id NULL, type[NEWS|EVENT|SCHOLARSHIP|EXTENSION_PROJECT|CALL],
      title, slug, summary, body_md, cover_file_id NULL, external_url NULL,
      status[DRAFT|PUBLISHED|ARCHIVED], pinned, published_at NULL,
      starts_at NULL, ends_at NULL, deadline_at NULL, location NULL, attributes JSONB,
      created_at, updated_at, deleted_at NULL)
      UQ(course_id, slug)
post_images(post_id, file_id, position)                PK(post_id, file_id)
-- links do curso: ver a seção Página de links

```

| Tipo                                    | Campos comuns obrigatórios | `attributes` (opcionais)                                                                    |
| --------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| `NEWS` notícia                          | —                          | —                                                                                           |
| `EVENT` evento                          | `starts_at`                | `modality` (`IN_PERSON`, `ONLINE`, `HYBRID`), `registrationUrl`; usa `ends_at` e `location` |
| `SCHOLARSHIP` bolsa                     | `deadline_at`              | `amountBrl`, `vacancies`, `weeklyHours`, `sponsor`, `requirements`                          |
| `EXTENSION_PROJECT` projeto de extensão | —                          | `coordinator`, `vacancies`, `contact`                                                       |
| `CALL` edital                           | `deadline_at`              | `number`, `issuer`, `documentUrl`                                                           |

- A validação por tipo é uma união discriminada em Zod no `packages/contracts` (`postInputSchema`), usada pelo formulário do web e pela API. As chaves de `attributes` são camelCase (D32), `attributes` não aceita chave de outro tipo e `ends_at` não pode ser antes de `starts_at`.
- Feed: `GET /courses/:course/hub?type=&cursor=`, com fixados primeiro e depois por `published_at` decrescente. Eventos aceitam o filtro "próximos"; bolsas e editais com prazo vencido aparecem como encerrados.
- O corpo é Markdown, renderizado com lista restrita de elementos (sem HTML cru).
- Links importantes: viram uma página própria do curso, no estilo Linktree (seção Página de links). O hub mostra os 5 primeiros links visíveis e um atalho para a página.

### Página de links

Cada curso tem uma página pública de links em `flow.ufc.br/l/{slug}`, com perfil, redes, seções, link em destaque e tema próprio. Moderadores do curso e admins editam; a página guarda só contagens anônimas de cliques.

```
course_link_pages(course_id PK, slug UQ, bio, avatar_file_id NULL, avatar_icon NULL, cover_file_id NULL,
      theme[CIANO|LARANJA|VERDE|VIOLETA|BRANCO|ESCURO], button_style[FILLED|OUTLINE|SOFT],
      button_shape[SQUARE|ROUNDED|PILL], title_font[CLASH|GEIST], is_published,
      updated_by, updated_at)
course_link_sections(id, course_id, title, position, is_visible)
course_links(id, course_id, section_id NULL, kind[URL|FILE|INTERNAL|POST], label, description NULL,
      url NULL, file_id NULL, internal_target NULL, post_id NULL,
      icon NULL, thumbnail_file_id NULL, is_featured, badge[NONE|NEW], open_in_same_tab,
      visible_from NULL, visible_until NULL, is_visible, position, created_by, created_at, updated_at)
      CHECK: exatamente um alvo preenchido, conforme kind
course_social_links(id, course_id, network[INSTAGRAM|EMAIL|WHATSAPP|YOUTUBE|SITE|OUTRO], url, position)
link_clicks_daily(link_id, day, source[PAGE|QR|HUB], clicks)           PK(link_id, day, source)
link_page_views_daily(course_id, day, source[PAGE|QR|HUB], views)      PK(course_id, day, source)
```

| Personalização                                     | Onde fica                                | Regra                                                                                           |
| -------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Ícone ou foto do curso, capa, bio                  | `course_link_pages`                      | Imagens pelo módulo de arquivos                                                                 |
| Tema, estilo e formato dos botões, fonte do título | `course_link_pages`                      | Só temas prontos, todos com contraste AA testado; os tokens ficam em `packages/contracts` (D31) |
| Seções                                             | `course_link_sections`                   | Ordenáveis e ocultáveis; link sem seção aparece no topo                                         |
| Ícone ou miniatura por link                        | `course_links.icon`, `thumbnail_file_id` | Miniatura tem prioridade sobre o ícone                                                          |
| Destaque com brilho                                | `course_links.is_featured`               | No máximo 1 por página, sempre no topo                                                          |
| Selo “Novo”                                        | `course_links.badge`                     | Marcado pelo moderador                                                                          |
| Aparecer só num período                            | `visible_from`, `visible_until`          | Fora do período o link some sozinho; o editor mostra “programado” ou “expirado”                 |
| Redes do curso                                     | `course_social_links`                    | Fileira de ícones abaixo da bio                                                                 |

- **Tipos de link:** endereço externo (`URL`), arquivo enviado, como um PDF de regulamento (`FILE`), tela do próprio Flow, como grade, fórum ou calendário (`INTERNAL`), e post do hub (`POST`). Um link de post some quando o post é arquivado.
- **Leitura pública:** `GET /l/:slug` devolve só o que está publicado, visível e dentro do período, com cache curto (60 s). Página despublicada responde 404.
- **Edição:** CRUD em `/courses/:course/link-page`, `/links`, `/link-sections` e `/social-links`. A ordem é salva em lote com `PUT /courses/:course/links/order`, depois de arrastar.
- **Cliques:** cada link público aponta para `GET /l/:slug/go/:linkId`, que soma 1 em `link_clicks_daily` e redireciona (302). A contagem é por dia e origem, sem usuário nem IP. O QR code é gerado no front com `?src=qr` e não é guardado.
- **Slug:** único e editável. Trocar o slug quebra QR codes já impressos, e o editor avisa antes de salvar.

## Fórum do curso

O fórum funciona como o X, sem tempo real: uma timeline de mensagens curtas por curso, respostas encadeadas, curtidas e menções a disciplinas com `@`. Lê quem está logado; escreve quem tem matrícula ativa no curso, além de moderadores e admins.

```
messages(id, course_id, author_id NULL, parent_id NULL, root_id NULL, content,
      reply_count, like_count, status[VISIBLE|HIDDEN|REMOVED],
      created_at, edited_at NULL, removed_at NULL, removed_by NULL, removal_reason NULL)
      índice (course_id, created_at DESC, id) WHERE parent_id IS NULL
message_likes(message_id, user_id, created_at)                   PK(message_id, user_id)
message_subject_mentions(message_id, subject_id)                 PK composta
message_reports(id, message_id, reporter_id,
      reason[SPAM|OFFENSIVE|HARASSMENT|PERSONAL_DATA|OFF_TOPIC|OTHER], details NULL,
      content_snapshot, status[OPEN|ACCEPTED|DISMISSED], resolved_by NULL, resolved_at NULL, created_at)
      UQ(message_id, reporter_id)
moderation_actions(id, course_id, moderator_id,
      action[HIDE_MESSAGE|REMOVE_MESSAGE|RESTORE_MESSAGE|MUTE_USER|BAN_USER|LIFT_RESTRICTION],
      target_message_id NULL, target_user_id NULL, report_id NULL, reason, created_at)
user_course_restrictions(id, user_id, course_id, type[MUTE|BAN], reason, created_by,
      created_at, expires_at NULL, lifted_at NULL)
```

**Mensagens e respostas.**

- Até 500 caracteres e até 5 menções por mensagem.
- Qualquer mensagem pode ser respondida. A resposta guarda `parent_id` (a que respondeu) e `root_id` (a que abriu a conversa).
- A timeline do curso mostra só mensagens raiz, das mais novas para as mais antigas, paginadas por cursor `(created_at, id)`.
- Abrir uma mensagem mostra a cadeia até a raiz e, abaixo, as respostas diretas paginadas, como uma conversa no X.
- `reply_count` e `like_count` são atualizados na mesma transação da resposta ou curtida.
- Sem tempo real: o front consulta a cada 60 s quantas mensagens novas existem desde o topo carregado e mostra "N novas mensagens".
- Edição permitida até 15 min após o envio (`edited_at` aparece na tela). Denúncias guardam `content_snapshot`, então editar não apaga a prova.
- Apagar a própria mensagem: sem respostas, ela some; com respostas, o conteúdo é removido e fica "mensagem apagada" para manter a conversa.

**Menções a disciplinas.**

1. No editor, digitar `@` abre um popover. O texto digitado depois do `@` filtra a lista (debounce de 150 ms) por código ou nome, sem acento e sem diferenciar maiúsculas.
2. A busca é `GET /courses/:course/subjects/search?q=&limit=8`: disciplinas da EC vigente do curso primeiro, depois o restante do catálogo. Usa índice trigram em `search_name` e prefixo em `code`.
3. Ao escolher, o editor insere o token `@ECO0005` no texto. Esse é o formato gravado.
4. Na gravação, a API extrai os tokens com a mesma função do `academic-core` (`@([A-Z]{2,5}\d{3,5})`), resolve cada código no catálogo e grava `message_subject_mentions`. Código inexistente continua texto comum.
5. Cada mensagem retornada traz `mentions: [{code, name, slug}]`. O front troca o token por um chip clicável que leva à página da disciplina, sem consultas extras.
6. A tabela de menções permite uma aba "Discussões" na página da disciplina. Na v2, `@` é só para disciplinas, não para usuários.

**Moderação.**

- Qualquer leitor logado denuncia uma mensagem, uma vez, com motivo.
- Mensagem com 3 denúncias abertas de pessoas diferentes fica `HIDDEN` automaticamente até um moderador decidir.
- Moderadores do curso e admins ocultam, removem ou restauram mensagens e silenciam (`MUTE`: lê, mas não escreve nem curte) ou banem (`BAN`: não acessa o fórum do curso) usuários, com prazo opcional. Toda ação vai para `moderation_actions` com motivo.
- Limite de envio por usuário (ex.: 1 mensagem a cada 10 s e 30 por hora), configurável e aplicado pela API.

## Notificações

As notificações existem só dentro da plataforma: um sino com contador, atualizado pelo mesmo polling de 60 s do fórum. Elas nascem de eventos de domínio (ex.: `MessageReplied`), tratados depois do commit por um barramento em memória (`@nestjs/event-emitter`).

```
notifications(id, user_id, type, actor_id NULL, course_id NULL, entity_type, entity_id,
      data JSONB, group_key NULL, read_at NULL, created_at, updated_at)
      índice (user_id, created_at DESC) · índice parcial (user_id) WHERE read_at IS NULL
      UQ parcial (user_id, group_key) WHERE read_at IS NULL
hub_reads(user_id, course_id, last_seen_at)                    PK(user_id, course_id)
```

| Tipo                         | Quem recebe                   | Disparado por                                 |
| ---------------------------- | ----------------------------- | --------------------------------------------- |
| `FORUM_REPLY`                | Autor da mensagem respondida  | Nova resposta                                 |
| `FORUM_THREAD_REPLY`         | Quem já respondeu na conversa | Nova resposta na mesma raiz                   |
| `FORUM_LIKES`                | Autor da mensagem             | Curtidas, agrupadas por mensagem              |
| `MESSAGE_MODERATED`          | Autor da mensagem             | Ocultação, remoção ou restauração             |
| `USER_RESTRICTED`            | Usuário silenciado ou banido  | Nova restrição ou fim dela                    |
| `MODERATOR_REQUEST_CREATED`  | Todos os admins               | Nova solicitação de moderação                 |
| `MODERATOR_REQUEST_REVIEWED` | Solicitante                   | Aprovação ou rejeição                         |
| `SCHEDULE_SECTION_CHANGED`   | Donos de agendas com a turma  | Coleta detecta mudança no `fingerprint`       |
| `SCHEDULE_SECTION_REMOVED`   | Donos de agendas com a turma  | Coleta marca `removed_at`                     |
| `SCRAPE_FAILED`              | Moderadores do curso e admins | Coleta termina em `FAILED`                    |
| `IMPORT_PENDING`             | Admins                        | Importação parada aguardando criação do curso |

- **Agrupamento:** notificações com o mesmo `group_key` ainda não lidas viram uma só (ex.: `likes:<message_id>` mostra "Ana e mais 4 curtiram"). O handler faz upsert, atualizando `data` e `updated_at`.
- **Sem fan-out do hub:** um post novo não gera uma notificação por aluno. O badge de novidades do hub compara `posts.published_at` com `hub_reads.last_seen_at`.
- **Nunca notifica** a própria ação do usuário, nem conteúdo de quem ele não pode ver.
- **Preferências:** tipos silenciados ficam em `user_preferences` (chave `notifications.muted`), checados pelo handler antes de gravar.
- **API:** `GET /me/notifications?cursor=`, `GET /me/notifications/unread-count`, `POST /me/notifications/read` (uma, várias ou todas).
- **Retenção:** o job diário apaga notificações lidas com mais de 90 dias.
- **Perda aceitável:** sem outbox, uma notificação pode se perder se a API cair entre o commit e o handler. A ação principal nunca é afetada.

## Importação e edição de grades

A extensão extrai a EC do SIGAA, a API a recebe como rascunho, e uma área administrativa no web (as funções do course-maker) completa e publica. A extensão e o upload manual usam o mesmo endpoint e o mesmo formato, `CurriculumImportV1`, definido em Zod no `packages/contracts`.

```
curriculum_imports(id, course_id NULL, course_sigaa_id, curriculum_id NULL, schema_version,
      source[EXTENSION|UPLOAD], payload JSONB, status[RECEIVED|APPLIED|FAILED|DISCARDED],
      conflicts JSONB (pontos para revisar, D55), imported_by NULL, created_at, applied_at NULL)
```

**Fluxo.**

1. A extensão, numa página logada do SIGAA, gera o `CurriculumImportV1`, já com requisitos e equivalências como expressão (corrigindo o `OU`).
2. Entrega: o moderador faz login no popup da extensão e clica em "Enviar para o UFC Flow" (Bearer guardado no `chrome.storage`), ou baixa o JSON e faz upload na área administrativa.
3. `POST /ingestion/curriculum-imports` valida o schema e guarda o JSON bruto. O curso é localizado pelo `sigaa_id` que a extensão resolveu (D34) e conferido contra a matriz e a unidade que vêm no arquivo; se o curso não existir no Flow, a importação fica parada até um admin criá-lo a partir do catálogo `sigaa_courses`.
4. A API cria a EC como `DRAFT`. Disciplinas são reaproveitadas pelo código; se uma existente tiver nome ou carga diferente, isso vira um conflito para revisão, sem sobrescrever.
5. IDs de vertente vindos da extensão (ex.: `emphasis-<slug>`) são chaves locais do arquivo e viram UUIDs ao aplicar.
6. Reimportar sobre uma EC do mesmo código (rascunho ou publicada) mostra o diff (adicionadas, removidas, alteradas) antes de aplicar (D53).
7. Publicar roda uma checagem: toda disciplina com natureza, vertentes válidas, nenhum ciclo de pré-requisitos, códigos de requisitos resolvidos ou sinalizados.

Como ficou na fase 5 (PR 5.1, D52 a D59):

- `POST /v1/ingestion/curriculum-imports` (`?source=UPLOAD` no upload) responde a importação com `status` e `pendingReason`: `APPLIED` quando o rascunho já nasceu, `RECEIVED` com `DIFF_REVIEW` na reimportação e com `COURSE_MISSING` quando o curso não existe.
- `GET /v1/ingestion/curriculum-imports/{id}` traz o diff e uma prévia dos pontos para revisar; `POST .../apply`, `.../discard` e `.../review-points/{key}/resolve` completam o fluxo.
- A checagem de publicação barra: EC vazia, vertente fora do lugar (só grupo de componentes fica dentro de outra vertente, e a mãe é ênfase), ciclo de pré-requisitos e ponto para revisar aberto. Avisa: requisito que cita código fora do catálogo, vertente vazia e sugestão de equivalência pendente.
- As travas da tabela "Ciclo de vida e edição" dependem da contagem de matrículas, que é zero até a fase 9.
- O seed (`seed:catalog`) leva os 9 ECs do `courses.ts` por esse pipeline, publicadas; Eng. de Computação 2006.2 usa a fixture real do SIGAA e as demais ficam com `needs_reimport`.

**Formato `CurriculumImportV1` (D33).** Definido em `packages/contracts/src/catalog/curriculum-import-v1.ts`.

- **Estrutura:**
  - `schemaVersion: 1`;
  - `source` com `extractedAt` e `url`;
  - `course` com `sigaaId`, só dígitos, `name` e `recognition` (D34);
  - `curriculum` com:
    - `code` e `effectiveTerm` (D35) e `sigaaId` da EC, quando capturado;
    - `matrixName`, `unitName` e `city`, como vieram;
    - as cargas e prazos de `curricula`, com `specificActivityHours` (D40) e `minEmphases`/`maxEmphases` (D37). `maxTotalHours` é opcional porque o SIGAA nem sempre mostra;
  - `branches` com `key` local, `parentKey`, tipo, nome, descrição, `sigaaCode`, cor, `mandatoryHours` e os limites mínimos e máximos de horas e componentes (D37);
  - `subjects` com:
    - código, nome, `type` (D30, D36);
    - o semestre como o SIGAA mostra (D39) e `durationTerms` (D38);
    - as cargas, créditos e natureza;
    - `prerequisites`, `corequisites`, `equivalences` e `branches` (`key` e `nature`).
- **Validação:**
  - Todos os objetos são estritos: um campo desconhecido é erro, para pegar digitação errada. Uma mudança incompatível vira `schemaVersion: 2`.
  - Os requisitos são `RequirementExpr` já na forma normalizada (D21). A extensão gera com `parseRequirement`, que normaliza.
  - O schema também recusa:
    - disciplina ou vertente repetida;
    - vertente inexistente (`parentKey` ou vínculo de disciplina);
    - ciclo entre vertentes;
    - mínimo maior que o máximo.

    Cada problema vem com o caminho do campo e um código em `params.code`: `CURRICULUM_IMPORT_DUPLICATE_SUBJECT`, `CURRICULUM_IMPORT_DUPLICATE_BRANCH`, `CURRICULUM_IMPORT_UNKNOWN_BRANCH`, `CURRICULUM_IMPORT_BRANCH_CYCLE` ou `CURRICULUM_IMPORT_INVALID_RANGE`.

  - Ciclos de pré-requisito não barram a importação: são checados ao publicar (passo 7).
- **Fixture:** `packages/contracts/fixtures/engenharia-de-computacao-2006-2.json`. É a EC 2006.2 de Eng. de Computação, a única que existe desse curso, com os 114 componentes do HTML real do SIGAA. Os requisitos com `OU` estão preservados, e as três vertentes vêm do `courses.ts`. Desde a fase 3 ela é gerada pelo parser da extensão, e um teste confere que os dois continuam iguais.

**Leitura na extensão (fase 3).** O parser lê a página nó a nó: nas páginas do SIGAA às vezes não há espaço entre as tags (`<acronym>A</acronym>E<acronym>B</acronym>`), e o texto da célula colaria código e operador. Assim, os 1.118 textos de requisito de 11 ECs reais (fixtures em `apps/extension/src/sigaa/__fixtures__`) viram expressão sem falha.

**Semestre das optativas (D39).** Vai como o SIGAA mostra. Quase sempre todas as optativas ficam sob um único cabeçalho igual ao último período, o que não serve de sugestão, mas Eng. de Materiais e Gestão de Políticas Públicas distribuem de verdade. Quem exibe decide: o painel da extensão mostra as optativas numa coluna própria.

**Funções do course-maker que migram para o web** (rotas em `/admin`, protegidas pela matriz de permissões):

| Função atual                                    | No UFC Flow                                           |
| ----------------------------------------------- | ----------------------------------------------------- |
| Criar, editar e excluir curso                   | Admin: criar e editar; excluir só sem ECs publicadas  |
| Criar EC manualmente                            | Moderador ou admin, nasce `DRAFT`                     |
| Importar EC de JSON e validar                   | Upload que chama o mesmo endpoint da extensão         |
| Editar disciplina na EC (requisitos, vertentes) | Editor da EC, com editor visual de expressão `E`/`OU` |
| Gerenciar vertentes                             | Editor da EC, com tipo, pai e mínimos                 |
| Vincular vertentes em lote                      | Mantido: escolher a vertente e clicar nas disciplinas |
| Exportar curso ou EC em JSON                    | `GET` de exportação no formato `CurriculumImportV1`   |
| Backup geral em JSON                            | Substituído pelo banco                                |

**Migração dos dados atuais.** Um script de seed converte `src/data/courses.ts` (6 cursos, 9 ECs) em payloads de importação e passa pelo mesmo pipeline. Os pré-requisitos atuais são listas, então entram como `E` de todos os códigos. Essas ECs ficam marcadas para reimportação com a extensão corrigida.

## Lacunas e riscos em aberto

O maior risco é a autenticidade: sem SMTP não dá para verificar e-mail institucional, e matrícula e histórico são autodeclarados. Avaliações e fórum dependem disso.

- **Identidade não verificada.** Qualquer pessoa pode criar conta, declarar uma matrícula e avaliar disciplinas. Por isso `registration_number` não é único: um número tomado por engano ou má-fé bloquearia o dono real. Mitigações na v2: limite de contas e envios, e o admin pode suspender usuários e descartar avaliações deles.
- **Sem backup.** Uma falha da VM perde contas, históricos, agendas e uploads de uma vez. Vale reavaliar antes de abrir a plataforma ao público.
- **Dependência do HTML do SIGAA.** Uma mudança de layout quebra a coleta de turmas e a extensão. Uma coleta com `FAILED` deve aparecer para os admins dentro da plataforma.
- **Notificações.** Modeladas na seção Notificações, só dentro da plataforma. Avisos por e-mail ou push ficam para depois e podem ler da mesma tabela `notifications` quando existirem.
- **Primeiro admin.** Precisa ser criado por um comando de seed na API, já que ninguém aprova o primeiro.
- **Semestre vigente.** Passa a ser responsabilidade de um admin cadastrar o semestre e marcá-lo como vigente; antes era variável de ambiente.
- **Conteúdo a definir.** Lista final de critérios de avaliação e categorias de atividades complementares de cada curso, conforme os regulamentos.
- **Horas complementares no progresso (D40).** A "Carga Horária Obrigatória de Atividade Acadêmica Específica" do SIGAA é a soma dos componentes obrigatórios que não são disciplina (estágio, TCC, unidade de extensão, tutoria e o componente de complementares), e não a exigência de horas complementares. O `computeProgress` do `academic-core` ainda recebe `complementaryActivityHours`; na fase 9, o progresso passa a ler a exigência do componente `COMPLEMENTARY_ACTIVITY` e o total da D27 é revisto para não contar esse componente duas vezes.
- **Plasmo parado.** A última versão do Plasmo (0.90.5) é de maio de 2025 e prende o Parcel 2.9, que já exigiu dois contornos na fase 3 (Tailwind pela CLI e zod empacotado) e tem um aviso de segurança sem correção no servidor de desenvolvimento. Se isso crescer, a extensão pode migrar para outro framework (por exemplo, WXT, sobre Vite); o código em `src/sigaa` e `src/lib` não depende do Plasmo.
- **Refresh concorrente no web.** Duas requisições sem o cookie de access token e com o mesmo refresh token (duas abas abrindo ao mesmo tempo, por exemplo) giram o token duas vezes; a segunda conta como reuso e revoca a família, e o usuário volta ao modo anônimo. O `proxy.ts` já ignora prefetch. Se acontecer na prática, a saída é uma janela curta de tolerância no reuso (aceitar o token anterior por alguns segundos) na API.
- **IP real atrás do Coolify.** O limite de tentativas e `sessions.ip` dependem de a API ver o IP do usuário. Com o web como BFF, quem chama a API é o servidor do Next, que repassa `x-forwarded-for`. No deploy (fase 13), a API não pode ficar exposta direto, para ninguém forjar esse cabeçalho, e o número de proxies confiáveis precisa bater com a rede do Coolify.
- **Travas sem matrículas.** As regras de edição depois da 1ª matrícula estão no agregado `Curriculum` e testadas, mas a porta que conta matrículas devolve zero até a fase 9. Até lá, toda EC é editável.
- **URLs públicas da extensão.** API e web da extensão vêm de `PLASMO_PUBLIC_FLOW_API_URL` e `PLASMO_PUBLIC_FLOW_WEB_URL`, hoje `localhost`. No deploy (fase 13), o `.env.production` passa a apontar para os endereços públicos e a extensão é reconstruída.
- **Slug fora do padrão.** Ciências Econômicas 2025.1 mora em `/2005-1` (herdado do `courses.ts`, D59). Corrigir o slug muda a URL pública; se for feito, vale um redirecionamento no web.
