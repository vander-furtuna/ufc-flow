---
name: modulo-api-hexagonal
description: Cria ou estende um módulo da API NestJS do UFC Flow (apps/api) na arquitetura hexagonal: entidade de domínio, caso de uso, tabela Drizzle e migration, controller com contrato Zod, Swagger completo, Problem Details, AccessPolicy, eventos e testes. Use ao adicionar rota, tabela, regra de permissão ou módulo novo na API.
argument-hint: <módulo e funcionalidade, ex. "catalog: publicar EC">
---

# Módulo da API (hexagonal)

Antes de tudo, confirme que o esqueleto da API existe (fase 4 do `docs/v2/roadmap.md`): `apps/api/src/shared`, `apps/api/src/database` e o Swagger configurado. Se `apps/api` ainda for o placeholder, avise o usuário e siga a fase 4 primeiro.

## 1. Leia a especificação

- A seção do módulo em `docs/v2/modelagem.md`: tabelas, colunas, constraints, regras, endpoints e notificações disparadas.
- A **Matriz de permissões** (Usuários, papéis e permissões) para saber quem pode chamar cada rota.
- `docs/v2/convencoes.md` › API.
- Se houver tela, a linha correspondente em `docs/v2/telas.md`, para conferir os dados que ela precisa.

## 2. Estrutura do módulo

```
apps/api/src/modules/<modulo>/
├─ domain/            entidades, value objects, erros (DomainError + code), portas (interfaces de repositório e serviços)
├─ application/       um caso de uso por arquivo: <verbo>-<coisa>.use-case.ts com execute()
└─ infrastructure/
   ├─ http/           controllers + mapeamento DTO ↔ domínio
   ├─ persistence/    <tabela>.schema.ts (Drizzle), repositórios, mappers
   └─ <modulo>.module.ts
```

- **Domínio** não importa `@nestjs/*` nem `drizzle-orm`. Tempo vem de `Clock` e IDs de `IdGenerator` (portas do `shared`).
- Regras acadêmicas puras vêm de `@ufc-flow/academic-core`, nunca reimplementadas aqui (skill `regra-academica-tdd`).
- Rigor completo (entidade rica + agregado) em `catalog`, `academic-record`, `planning`, `forum` e `identity`. CRUD simples (links, critérios de avaliação) pode ir de caso de uso direto ao repositório.

## 3. Passo a passo

1. **Contrato:** crie ou ajuste o schema Zod em `packages/contracts` (entrada, saída, enums). É a fonte para validação, Swagger e formulário do web.
2. **Testes de domínio primeiro:** cada regra da modelagem vira um caso. Por exemplo, cada linha da tabela "Ciclo de vida e edição" do `Curriculum`.
3. **Domínio e caso de uso.** O caso de uso:
   - checa permissão pela `AccessPolicy` (ex.: `canManageHub(user, courseId)`), além do guard;
   - devolve `Result` ou lança `DomainError` com código estável em `SCREAMING_SNAKE_CASE`;
   - publica eventos de domínio quando a seção Notificações pedir, tratados **depois do commit** via `@nestjs/event-emitter`.
4. **Persistência:**
   - Schema Drizzle no `*.schema.ts` do módulo dono da tabela, fiel às colunas, UQ parciais, CHECKs e índices da modelagem.
   - `pnpm --filter @ufc-flow/api drizzle-kit generate` e **revise o SQL gerado** à mão. Nunca edite uma migration já mesclada.
   - FKs de autoria com `ON DELETE SET NULL` e de dados pessoais com `ON DELETE CASCADE` (LGPD).
   - Alterações em EC publicada, moderação e papéis gravam em `audit_logs`.
5. **HTTP:**
   - Rotas em `/v1/...`, plural, aninhadas por curso quando o recurso é do curso.
   - Paginação por cursor (`?cursor=&limit=`) com o schema compartilhado.
   - Validação pelo schema Zod do `contracts`.
   - Swagger: `@ApiTags('<modulo>')`, `@ApiOperation({ summary: '<em português>' })`, exemplo de corpo e **todas** as respostas, incluindo erros em Problem Details e `@ApiBearerAuth` nas protegidas.
6. **Testes das outras camadas:**
   - Caso de uso com repositório em memória que implementa a porta.
   - Repositório Drizzle com Testcontainers (PostgreSQL), com as migrations aplicadas.
   - e2e com supertest: caminho feliz, 401/403 da matriz e cada erro documentado.
7. **OpenAPI:** regenere o `openapi.json` versionado e confira o diff.

## 4. Pronto quando

- `pnpm --filter @ufc-flow/api test`, `pnpm typecheck` e `pnpm lint` passam, e o teste que varre o OpenAPI não acusa rota sem resumo ou sem respostas.
- A rota aparece e funciona em `/docs` com o botão Authorize.
- A modelagem continua verdadeira; se algo mudou, use a skill `atualizar-modelagem`.
- A caixa correspondente em `docs/v2/roadmap.md` está marcada.
