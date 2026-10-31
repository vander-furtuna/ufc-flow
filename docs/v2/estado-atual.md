# Estado atual do repositório

Retrato em 31/10/2026, no momento da migração do trabalho para o Claude Code. Atualize este arquivo ao fim de cada fase do [roadmap](roadmap.md).

## Branches

| Branch                       | Situação                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `master`                     | Produção (deploy no Coolify). Contém o hotfix das agendas locais. `origin/HEAD` aponta para ela.   |
| `develop`                    | Integração. Sincronizada com `master` e com o hotfix.                                              |
| `feature/monorepo`           | Monorepo pnpm + Turborepo, pnpm 11 e esta documentação. **Ainda sem `pnpm-lock.yaml` e sem PR.**   |
| `main`                       | Existe junto com `master`. A modelagem decide manter só `main` como produção; ainda não foi feito. |
| `hotfix/schedule-course-key` | Já mesclada em `master` e `develop`; pode ser apagada.                                             |

Nada do que está acima foi enviado ao GitHub (`git push origin master develop feature/monorepo` é responsabilidade do usuário). A branch `feat/users` foi descartada e apagada localmente; falta apagar no remoto (`git push origin --delete feat/users`).

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
- **Modelagem v2 fechada** ([modelagem.md](modelagem.md)), com 19 decisões (D1–D19) e 11 lacunas resolvidas (L1–L11).
- **39 telas desenhadas** para desktop, mobile e extensão ([telas.md](telas.md)).

## Pendências imediatas (fase 0 do roadmap)

1. Gerar `pnpm-lock.yaml` com `pnpm install` na raiz (não foi possível no ambiente anterior) e confirmar que `pnpm typecheck`, `pnpm lint` e `pnpm build` passam.
2. Erro de lint conhecido e anterior ao monorepo: `react-hooks/set-state-in-effect` no `useEffect` que chama `init()` em `apps/web/src/contexts/schedule.tsx`. Ele quebra o passo de lint do CI.
3. Migrar ESLint → oxlint (decisão D19).
4. Decidir e executar `main` × `master` (a modelagem escolhe `main`), ajustando o CI e o Coolify.
5. Criar `docker/compose.dev.yml` com o PostgreSQL de desenvolvimento.
6. Unificar os dois bancos IndexedDB do web (`UFCFlowDB` e `ufc-flow-indexeddb`). É pré-requisito da importação de agendas.

## Divergências entre a modelagem e o repositório

| Modelagem diz                                        | Repositório hoje                                            | O que vale                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/eslint-config` e `packages/tsconfig`       | `tsconfig.base.json` na raiz; sem pacote de lint            | Raiz. Com o oxlint (D19), uma `.oxlintrc.json` na raiz substitui o pacote de ESLint. |
| `docker/` com compose de desenvolvimento             | Não existe                                                  | Criar na fase 0.                                                                     |
| `main` = produção; CI em PRs para `develop` e `main` | Produção em `master`; CI só em `master`                     | Seguir a modelagem quando a pendência 4 for feita.                                   |
| Caminho `src/data/courses.ts`                        | `apps/web/src/data/courses.ts`                              | O novo caminho.                                                                      |
| Extensão = Plasmo, "o atual sigaa-classes-scraping"  | O repositório irmão usa Plasmo e tem trabalho não commitado | Migrar a cópia de trabalho para `apps/extension` (fase 3).                           |

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
- **Persistência local:** IndexedDB `UFCFlowDB` v6 (`apps/web/src/lib/indexeddb.ts`), com os stores `schedules` (cache de turmas), `user_schedules` (agendas), `user_preferences`, `academic_calendar` e `ru_menus`. Há um segundo banco, `ufc-flow-indexeddb` (`apps/web/src/storage/indexed-db`), com os stores de filtros e ferramentas.
- **Semestre vigente:** variáveis `NEXT_PUBLIC_CURRENT_YEAR` e `NEXT_PUBLIC_CURRENT_SEMESTER`. Na v2 isso passa para `academic_terms.is_current`.
- **Deploy:** o Coolify faz o build do `Dockerfile` da raiz. A saída é standalone do Next, na porta 3000.
