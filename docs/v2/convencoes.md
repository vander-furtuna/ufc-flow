# Convenções

## Código

- **TypeScript estrito** em todos os pacotes. Nada de `any` sem comentário explicando o motivo.
- **Formatação:** Prettier com `singleQuote`, sem ponto e vírgula, `trailingComma: all`, 80 colunas e `prettier-plugin-tailwindcss` (config em `.prettierrc` na raiz). Quebras de linha LF. `pnpm format` formata e `pnpm format:check` confere. Rode o Prettier sempre da raiz: o `.prettierignore` fica lá e protege as fixtures HTML do SIGAA, que estão em windows-1252.
- **Lint:** oxlint com a config `.oxlintrc.json` da raiz, rodado por `pnpm lint` em cada pacote, sem `--fix`. Para suprimir uma regra do React Compiler, use o alias do plugin JS: `// oxlint-disable-next-line react-hooks-js/<regra>`.
- **Nomes de arquivo** em kebab-case (`app-search-bar.tsx`, `resolve-schedule-course.ts`). Componentes React em PascalCase no código.
- **Imports no web:** alias `@/` → `apps/web/src`. Pacotes internos por nome (`@ufc-flow/academic-core`).
- **Identificadores em inglês**; textos de interface em português do Brasil, escritos direto no JSX (não há i18n).
- **Sem lógica de domínio em componentes.** Componentes chamam hooks; hooks chamam serviços ou API; regras ficam no `academic-core`.

## Web (`apps/web`)

- App Router do Next 16, React 19 com React Compiler ligado (`reactCompiler: true`): evite `useMemo`/`useCallback` manuais novos, a não ser que um teste prove a necessidade.
- **Dados do servidor:** TanStack Query. Chaves de query centralizadas por domínio (ex.: `queryKeys.catalog.curriculum(courseSlug, curriculumSlug)`).
- **Formulários:** react-hook-form + `zodResolver` com o schema do `packages/contracts`.
- **Autenticação (fase 4+):** o web é BFF. Tokens só em cookies httpOnly e chamadas autenticadas à API em Server Components, Server Actions ou route handlers, nunca do browser com token exposto.
- **Componentes de UI:** shadcn em `apps/web/src/components/ui`. Adicione novos com o CLI do shadcn (`components.json` já configurado).
- **IndexedDB:** é cache e armazenamento do modo anônimo, nunca fonte da verdade para usuário logado.

## API (`apps/api`)

- Um módulo por contexto da modelagem: `identity`, `catalog`, `classes`, `planning`, `academic-record`, `evaluation`, `hub`, `forum`, `files`, `ingestion`.
- Camadas por módulo:
  - `domain/`: entidades, value objects, erros de domínio e portas. Não importa NestJS nem Drizzle.
  - `application/`: casos de uso, uma classe por caso, com método `execute`.
  - `infrastructure/`: controllers, repositórios Drizzle, mappers e `*.schema.ts`.
- **Erros:** o domínio devolve `Result` ou lança `DomainError` com `code`. Um filtro global converte para Problem Details (`application/problem+json`). Códigos estáveis em `SCREAMING_SNAKE_CASE`, como `CURRICULUM_LOCKED_FIELD` ou `SCHEDULE_TIME_CONFLICT`.
- **IDs:** UUID gerados pela porta `IdGenerator`. Exceção: o id de agendas vem do cliente, para a importação ser idempotente.
- **Tempo:** sempre pela porta `Clock`; nunca `new Date()` no domínio.
- **Rotas:** versionadas em `/v1`, recursos no plural, aninhadas por curso quando o recurso é do curso (`/v1/courses/:course/hub`). Paginação por cursor (`?cursor=&limit=`).
- **Swagger:** `@ApiTags` por módulo, `@ApiOperation` com resumo em português, exemplos e todas as respostas, inclusive as de erro.
- **Migrations:** geradas com `drizzle-kit generate` e revisadas à mão. Nunca edite uma migration já mesclada em `develop`.
- **Permissões:** checadas por `AccessPolicy` no caso de uso, não só no guard.
- **Injeção de dependência:** todo construtor injetado usa `@Inject(token)` explícito, inclusive para classes (`@Inject(SignInUseCase)`). O projeto não liga `emitDecoratorMetadata`, porque tsx, esbuild e Vitest não geram esses metadados (D42); sem o `@Inject`, o Nest injeta `undefined`. Portas do domínio têm tokens `Symbol` declarados ao lado da interface.
- **Validação:** `ZodValidationPipe` com o schema do `contracts` no `@Body`/`@Query`; nada de class-validator.

## Testes

| Camada                           | Ferramenta                           | Regra                                                                                   |
| -------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| `academic-core` e domínio da API | Vitest                               | Escreva o teste antes; cada linha das tabelas de regras da modelagem vira um caso       |
| Casos de uso                     | Vitest + repositórios em memória     | Sem banco, sem Nest                                                                     |
| Repositórios Drizzle             | Vitest + Testcontainers (PostgreSQL) | Um container por arquivo de teste, com as migrations aplicadas; arquivo `*.int.test.ts` |
| HTTP                             | supertest sobre o app Nest           | Fluxo feliz e erros documentados no Swagger; arquivo `apps/api/test/*.e2e.test.ts`      |
| Web                              | Vitest + Testing Library             | Componentes com lógica de estado (editor de expressão, formulários)                     |
| Extensão                         | Vitest com fixtures HTML do SIGAA    | O parser nunca é testado contra o SIGAA ao vivo                                         |

Arquivos de teste ficam ao lado do código: `*.test.ts`. Fixtures em `__fixtures__/` no pacote. Na API, `pnpm test` roda só os unitários (sem Docker) e `pnpm test:integration` roda os `*.int.test.ts` e os e2e, que precisam do Docker ligado (D49).

## Git e PRs

- Branches: `feature/<assunto>`, `fix/<assunto>`, `hotfix/<assunto>`, `release/vX.Y.Z`, sempre a partir de `develop` (hotfix a partir da branch de produção).
- Commits em inglês, no padrão Conventional Commits, com escopo quando fizer sentido: `feat(catalog): publish curriculum with validation`.
- Um PR por entrega coerente, mesclado em `develop`. A descrição diz o que mudou, como testar e quais caixas do roadmap fecha.
- Ao concluir a entrega, com a definição de pronto cumprida, o agente envia a branch e abre o PR para `develop` com `gh pr create`. O merge é sempre do usuário; o agente nunca faz merge, push direto em `develop` ou `master`, nem `push --force`.

## Definição de pronto

Uma tarefa está pronta quando:

1. `pnpm typecheck`, `pnpm lint` e os testes do pacote passam.
2. As regras novas têm testes, e as rotas novas têm Swagger completo.
3. As telas implementadas batem com `docs/v2/telas` nos dois temas e em 390 px e 1440 px.
4. O modo anônimo continua funcionando.
5. A modelagem e o roadmap estão atualizados se algo mudou.
