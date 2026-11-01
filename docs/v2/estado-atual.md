# Estado atual do repositório

Retrato em 31/10/2026, ao fim da fase 0. Atualize este arquivo ao fim de cada fase do [roadmap](roadmap.md).

## Branches

| Branch                       | Situação                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `master`                     | Produção (deploy no Coolify), e continua sendo (D20). `origin/HEAD` aponta para ela. |
| `develop`                    | Integração. Tem o monorepo e a fase 0 (PR #61, CI verde).                            |
| `feature/fase-0-fundacao`    | Mesclada em `develop` pelo PR #61; pode ser apagada.                                 |
| `feature/monorepo`           | Mesclada em `develop`; pode ser apagada.                                             |
| `main`                       | Desatualizada em relação à `master`. Deve ser apagada no remoto (D20).               |
| `hotfix/schedule-course-key` | Já mesclada em `master` e `develop`; pode ser apagada.                               |

Falta apagar `main` no remoto (`git push origin --delete main`).

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
  - Lint com oxlint e type-aware (`.oxlintrc.json` na raiz). As regras do React Compiler vêm do plugin JS `react-hooks-js`. Ficam 5 avisos de `jsx-a11y` (`vander-logo.tsx`, `ui/field.tsx`, `calendario/components/calendar-view.tsx`).
  - Prettier na raiz, com o repositório inteiro formatado e as quebras de linha normalizadas para LF.
  - Vitest com config por pacote e tarefa `test` no Turborepo.
  - `set-state-in-effect` corrigido nos contexts `schedule`, `class` e `calendar`.
  - IndexedDB unificado no `UFCFlowDB` v7, com migração e testes (`apps/web/src/lib/ufc-flow-db.test.ts`).
  - `docker/compose.dev.yml` (PostgreSQL 17) e `apps/api/.env.example`.
  - CI em PRs para `develop` e `master`, com formatação e testes.
- **Modelagem v2 fechada** ([modelagem.md](modelagem.md)), com 20 decisões (D1–D20) e 11 lacunas resolvidas (L1–L11).
- **39 telas desenhadas** para desktop, mobile e extensão ([telas.md](telas.md)).

## Pendências imediatas

A fase 0 está pronta: CI verde no PR #61 para `develop`, `docker compose -f docker/compose.dev.yml up -d` sobe o PostgreSQL 17 (healthy, porta 5432) e o Vercel de testes voltou a publicar com o Root Directory em `apps/web`. Sobram:

1. Apagar `main` no remoto e conferir que o GitHub (branch padrão) e o Coolify usam `master`.
2. Conferir num navegador com dados reais que filtros, ferramentas e agendas continuam lá depois da migração para o `UFCFlowDB` v7.
3. Corrigir os 5 avisos de `jsx-a11y` e passar essas regras para erro. Os de `calendario` dependem de uma exceção à D10.

## Divergências entre a modelagem e o repositório

| Modelagem diz                                       | Repositório hoje                                            | O que vale                                                 |
| --------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Caminho `src/data/courses.ts`                       | `apps/web/src/data/courses.ts`                              | O novo caminho.                                            |
| Extensão = Plasmo, "o atual sigaa-classes-scraping" | O repositório irmão usa Plasmo e tem trabalho não commitado | Migrar a cópia de trabalho para `apps/extension` (fase 3). |

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
