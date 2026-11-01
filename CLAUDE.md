# UFC Flow — guia para agentes

UFC Flow é uma plataforma para estudantes da Universidade Federal do Ceará: grade curricular interativa com pré-requisitos, turmas do semestre, simulador de agenda, cardápio do RU e calendário acadêmico. É o TCC de Vanderlei Furtuna. Em produção hoje é só o front (Next.js, dados estáticos em `apps/web/src/data/courses.ts`).

O trabalho atual é a **v2**: API NestJS + PostgreSQL, contas de usuário, histórico acadêmico, agendas sincronizadas, hub do curso, página de links, fórum, avaliação de disciplinas, área administrativa de grades e uma extensão de navegador que extrai a estrutura curricular do SIGAA.

## Leia antes de qualquer tarefa da v2

| Documento                                            | Para quê                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| [docs/v2/README.md](docs/v2/README.md)               | Índice e ordem de leitura                                              |
| [docs/v2/estado-atual.md](docs/v2/estado-atual.md)   | O que já existe, o que está pela metade e divergências com a modelagem |
| [docs/v2/modelagem.md](docs/v2/modelagem.md)         | **Fonte de verdade**: decisões, tabelas, regras de domínio, endpoints  |
| [docs/v2/roadmap.md](docs/v2/roadmap.md)             | Fases em ordem, entregas e critérios de aceite                         |
| [docs/v2/telas.md](docs/v2/telas.md)                 | As 39 telas desenhadas (PNG + HTML), por fase                          |
| [docs/v2/design-system.md](docs/v2/design-system.md) | Tokens, tipografia e como traduzir os mockups para Tailwind/shadcn     |
| [docs/v2/convencoes.md](docs/v2/convencoes.md)       | Padrões de código, testes, commits, git flow e definição de pronto     |

Ao começar uma fase, leia a seção correspondente do roadmap, as seções da modelagem que ela cita e as telas listadas nela. Não invente regra de negócio: se algo não está na modelagem, pergunte ao usuário ou registre como pergunta em aberto.

## Estrutura do monorepo

```
apps/
  web/              Next.js 16 + React 19 (o front atual, @ufc-flow/web)
  api/              NestJS + Drizzle + PostgreSQL (@ufc-flow/api) — placeholder
  extension/        extensão do SIGAA, Plasmo (@ufc-flow/extension) — placeholder
packages/
  contracts/        schemas Zod compartilhados (@ufc-flow/contracts)
  academic-core/    regras acadêmicas puras, sem framework (@ufc-flow/academic-core)
docs/v2/            documentação da v2 (este conjunto)
```

- Pacotes internos exportam o TypeScript direto (`"exports": {".": "./src/index.ts"}`), sem build próprio. Quem consome (web/api) transpila. Se a API precisar de JS compilado, adicione build com `tsup` naquele pacote e ajuste o `turbo.json`.
- Versões compartilhadas (TypeScript, Zod, `@types/node`) ficam no `catalog` do `pnpm-workspace.yaml`; nos `package.json` use `"catalog:"`.
- `tsconfig.base.json` na raiz é a base dos pacotes novos. O web tem seu próprio `tsconfig.json` (Next).

## Comandos

Gerenciador: **pnpm 11** (versão fixada em `packageManager`). Node 22 ou 24 (`engines`: `>=22 <25`). O usuário desenvolve no **Windows** (PowerShell); prefira comandos que funcionem lá.

```bash
pnpm install                          # na raiz
pnpm dev:web                          # front em http://localhost:3000
pnpm build | pnpm lint | pnpm typecheck | pnpm test   # todos os pacotes, via Turborepo
pnpm format | pnpm format:check       # Prettier no repositório inteiro
docker compose -f docker/compose.dev.yml up -d   # PostgreSQL de desenvolvimento
pnpm --filter @ufc-flow/web <script>  # um pacote específico
pnpm --filter @ufc-flow/academic-core add -D vitest   # dependência num pacote
```

- Rode `pnpm typecheck`, `pnpm lint` e os testes do pacote afetado antes de dizer que uma tarefa está pronta.
- Variáveis do web: `apps/web/.env.local` (modelo em `apps/web/.env.example`).
- O CI (`.github/workflows/ci.yml`) roda em PRs para `develop` e `master`: install com `--frozen-lockfile`, `format:check`, lint (oxlint type-aware), typecheck, test e build.

## Regras do projeto

- **Domínio primeiro, com testes.** Regras acadêmicas (requisitos, conflito de horário, progresso, termo `2026.1`, menções `@CÓDIGO`) vão em `packages/academic-core`, escritas com TDD (Vitest). Web e API importam de lá; nunca duplique essas regras. O pacote exige 90% de cobertura (`pnpm --filter @ufc-flow/academic-core test`).
- **Contratos únicos.** DTOs, enums e o formato `CurriculumImportV1` vivem em `packages/contracts` (Zod 4), tipados contra o `academic-core`. Validação da API, Swagger (`toOpenApiComponents()`) e formulários do web derivam do mesmo schema. Dê `.meta({ id })` a todo schema que vira componente do Swagger. Também exige 90% de cobertura.
- **API hexagonal por módulo** (`domain/`, `application/`, `infrastructure/`), com o rigor completo onde a modelagem pede (catalog, academic-record, planning, forum, identity). Detalhes em `docs/v2/modelagem.md` › Monorepo e arquitetura.
- **Swagger obrigatório** em toda rota, com respostas de erro em Problem Details. Rota sem documentação quebra o CI.
- **Não mexa no RU nem no Calendário Acadêmico** (`apps/web/src/app/restaurante`, `calendario`, `api/ru`, `api/calendar`): continuam como estão (decisão D10).
- **Anônimo continua funcionando.** Grade, turmas e agenda local não podem passar a exigir login.
- **Sem SMTP na v2.** Nada de envio de e-mail; recuperação de senha é por link gerado pelo admin.
- **Idioma:** interface e documentação em português do Brasil; identificadores de código em inglês; mensagens de commit em inglês (Conventional Commits).
- **Telas:** os mockups em `docs/v2/telas/html` usam estilos inline só por limitação da ferramenta de design. Implemente com os componentes e tokens do web (Tailwind v4 + shadcn), seguindo `docs/v2/design-system.md`.
- Mudou uma decisão ou regra? Atualize `docs/v2/modelagem.md` no mesmo PR e acrescente a linha no Registro de decisões.

## Git

- Git flow: `feature/*` a partir de `develop`, com PR para `develop`; `hotfix/*` a partir da branch de produção (`master`, decisão D20), mesclada nela e em `develop`. Nunca commite direto na branch de produção.
- Conventional Commits: `feat(scope): ...`, `fix`, `chore`, `refactor`, `docs`, `test`.
- Faça commit só quando o usuário pedir ou quando a tarefa combinada incluir isso. Não faça push sem pedido explícito.

## Skills e comandos

Ficam em `.claude/skills/` (versionadas). Use a skill certa antes de começar o tipo de tarefa que ela cobre.

| Skill                         | Use para                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `regra-academica-tdd`         | Qualquer regra acadêmica pura no `packages/academic-core`, com teste antes                              |
| `modulo-api-hexagonal`        | Rota, tabela, permissão ou módulo novo na API                                                           |
| `implementar-tela`            | Construir ou alterar uma tela do web a partir de `docs/v2/telas`                                        |
| `atualizar-modelagem`         | Manter `docs/v2` em dia quando uma decisão muda ou uma fase termina                                     |
| `shadcn`                      | Adicionar e compor componentes shadcn. Rode o CLI a partir de `apps/web`, onde está o `components.json` |
| `turborepo`                   | `turbo.json`, tarefas, cache e filtros. A skill lê a documentação embutida em `node_modules/turbo/docs` |
| `vercel-react-best-practices` | Escrever e revisar código React/Next com foco em desempenho                                             |
| `vercel-composition-patterns` | Desenhar a API de componentes reutilizáveis                                                             |
| `web-design-guidelines`       | Revisar UI (acessibilidade, UX) antes de fechar uma tela                                                |
| `migrate-oxlint`              | A migração ESLint → oxlint da fase 0                                                                    |

As skills públicas (as seis últimas) são instaladas com `scripts/instalar-skills.ps1` e registradas em `skills-lock.json`; para atualizar, use `npx skills update -p`. A skill `design-taste-frontend` em `.agents/skills/` é para landing pages e redesigns livres: **não** a use nas telas da v2, que já têm design definido.

Comando: `/iniciar-fase <n>` prepara o trabalho de uma fase do roadmap (leitura, plano para aprovação e branch).

## Repositórios de origem (fora deste repo)

Ficam ao lado deste, em `C:\Users\furtu\www\`:

- `sigaa-classes-scraping/` — extensão Plasmo atual. **Tem trabalho não commitado** (`parser.ts`, `scraping.ts`, `content.tsx`, `components/Dashboard.tsx`, fontes em `assets/`): migre a partir da cópia de trabalho, não do histórico do git. Contém o bug que transforma todo `OU` dos requisitos em `E`.
- `sigaa-course-maker/` — editor de grades (Vite + React). Suas funções viram a área `/admin` do web; não é migrado como app.
